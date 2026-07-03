package com.asim.remoteassist

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.Base64
import okhttp3.*
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

class ScreenShareService : Service() {
    private val channelId = "remoteassist_share"
    private val notificationId = 1001
    private var projection: MediaProjection? = null
    private var reader: ImageReader? = null
    private var handlerThread: HandlerThread? = null
    private var ws: WebSocket? = null
    private var lastFrameAt = 0L
    private var sessionCode = ""
    private var stopping = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelfSafely()
            return START_NOT_STICKY
        }

        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED) ?: Activity.RESULT_CANCELED
        @Suppress("DEPRECATION")
        val data: Intent? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent?.getParcelableExtra(EXTRA_DATA, Intent::class.java)
        } else {
            intent?.getParcelableExtra(EXTRA_DATA)
        }
        val serverUrl = intent?.getStringExtra(EXTRA_SERVER_URL) ?: return START_NOT_STICKY
        sessionCode = intent.getStringExtra(EXTRA_SESSION_CODE) ?: ""

        startVisibleNotification()

        if (resultCode != Activity.RESULT_OK || data == null || sessionCode.isBlank()) {
            stopSelfSafely()
            return START_NOT_STICKY
        }

        connectSocket(serverUrl)
        startProjection(resultCode, data)
        return START_STICKY
    }

    private fun startVisibleNotification() {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "مشاركة شاشة RemoteAssist",
                NotificationManager.IMPORTANCE_LOW
            )
            manager.createNotificationChannel(channel)
        }
        val stopIntent = PendingIntent.getService(
            this,
            10,
            Intent(this, ScreenShareService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = Notification.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.presence_video_online)
            .setContentTitle("RemoteAssist يعمل الآن")
            .setContentText("مشاركة شاشة نشطة — الرمز: $sessionCode")
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "إيقاف", stopIntent)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(notificationId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
        } else {
            startForeground(notificationId, notification)
        }
    }

    private fun connectSocket(serverUrl: String) {
        val client = OkHttpClient.Builder()
            .pingInterval(20, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
        val request = Request.Builder().url(serverUrl).build()
        ws = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                val join = JSONObject()
                    .put("type", "join")
                    .put("role", "host")
                    .put("code", sessionCode)
                webSocket.send(join.toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                val msg = runCatching { JSONObject(text) }.getOrNull() ?: return
                when (msg.optString("type")) {
                    "tap" -> RemoteControlBridge.tap(
                        msg.optDouble("x", 0.5).toFloat(),
                        msg.optDouble("y", 0.5).toFloat()
                    )
                    "swipe" -> RemoteControlBridge.swipe(
                        msg.optDouble("fromX", 0.5).toFloat(),
                        msg.optDouble("fromY", 0.5).toFloat(),
                        msg.optDouble("toX", 0.5).toFloat(),
                        msg.optDouble("toY", 0.5).toFloat(),
                        msg.optLong("durationMs", 350L)
                    )
                }
            }
        })
    }

    private fun startProjection(resultCode: Int, data: Intent) {
        val metrics = resources.displayMetrics
        val width = metrics.widthPixels
        val height = metrics.heightPixels
        val density = metrics.densityDpi

        handlerThread = HandlerThread("RemoteAssistFrames").also { it.start() }
        val handler = Handler(handlerThread!!.looper)
        reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        reader?.setOnImageAvailableListener({ imageReader ->
            val now = System.currentTimeMillis()
            if (now - lastFrameAt < 450L) {
                imageReader.acquireLatestImage()?.close()
                return@setOnImageAvailableListener
            }
            lastFrameAt = now
            val image = imageReader.acquireLatestImage() ?: return@setOnImageAvailableListener
            try {
                sendImageFrame(image, width, height)
            } finally {
                image.close()
            }
        }, handler)

        val mgr = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        projection = mgr.getMediaProjection(resultCode, data)
        projection?.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() {
                stopSelfSafely()
            }
        }, handler)
        projection?.createVirtualDisplay(
            "RemoteAssistDisplay",
            width,
            height,
            density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            reader?.surface,
            null,
            handler
        )
    }

    private fun sendImageFrame(image: Image, screenWidth: Int, screenHeight: Int) {
        val plane = image.planes[0]
        val buffer: ByteBuffer = plane.buffer
        val pixelStride = plane.pixelStride
        val rowStride = plane.rowStride
        val rowPadding = rowStride - pixelStride * screenWidth
        val bitmap = Bitmap.createBitmap(
            screenWidth + rowPadding / pixelStride,
            screenHeight,
            Bitmap.Config.ARGB_8888
        )
        bitmap.copyPixelsFromBuffer(buffer)
        val cropped = Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight)
        bitmap.recycle()

        val maxWidth = 900
        val scaled = if (screenWidth > maxWidth) {
            val ratio = maxWidth.toFloat() / screenWidth.toFloat()
            Bitmap.createScaledBitmap(cropped, maxWidth, (screenHeight * ratio).roundToInt(), true)
        } else cropped

        val out = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, 55, out)
        if (scaled !== cropped) scaled.recycle()
        cropped.recycle()

        val payload = JSONObject()
            .put("type", "frame")
            .put("code", sessionCode)
            .put("w", screenWidth)
            .put("h", screenHeight)
            .put("jpeg", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP))
        ws?.send(payload.toString())
    }

    private fun stopSelfSafely() {
        if (stopping) return
        stopping = true
        ws?.close(1000, "stop")
        ws = null
        reader?.close()
        reader = null
        runCatching { projection?.stop() }
        projection = null
        handlerThread?.quitSafely()
        handlerThread = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        stopSelfSafely()
        super.onDestroy()
    }

    companion object {
        const val ACTION_STOP = "com.asim.remoteassist.STOP"
        const val EXTRA_RESULT_CODE = "resultCode"
        const val EXTRA_DATA = "data"
        const val EXTRA_SERVER_URL = "serverUrl"
        const val EXTRA_SESSION_CODE = "sessionCode"
    }
}
