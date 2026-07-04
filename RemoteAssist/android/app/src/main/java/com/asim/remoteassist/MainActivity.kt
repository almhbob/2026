package com.asim.remoteassist

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.util.Base64
import android.view.Gravity
import android.view.MotionEvent
import android.widget.*
import okhttp3.*
import org.json.JSONObject
import java.util.Locale
import java.util.Random
import java.util.concurrent.TimeUnit

class MainActivity : Activity() {
    private lateinit var serverInput: EditText
    private lateinit var codeInput: EditText
    private lateinit var status: TextView
    private lateinit var preview: ImageView
    private var viewerSocket: WebSocket? = null
    private var pendingSessionCode: String = ""

    private val screenCaptureRequest = 501

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestNotificationPermissionIfNeeded()
        buildUi()
    }

    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 36, 32, 24)
            gravity = Gravity.CENTER_HORIZONTAL
        }

        val title = TextView(this).apply {
            text = "RemoteAssist"
            textSize = 28f
            gravity = Gravity.CENTER
        }
        val subtitle = TextView(this).apply {
            text = "دعم فني عن بُعد بموافقة واضحة ورمز جلسة"
            textSize = 14f
            gravity = Gravity.CENTER
        }

        serverInput = EditText(this).apply {
            hint = "رابط السيرفر: ws://192.168.1.10:8080"
            setText("ws://192.168.1.10:8080")
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
        }

        codeInput = EditText(this).apply {
            hint = "رمز الجلسة للهاتف الآخر"
            inputType = InputType.TYPE_CLASS_NUMBER
        }

        val shareButton = Button(this).apply {
            text = "مشاركة هاتفي"
            setOnClickListener { startHostFlow() }
        }

        val accessibilityButton = Button(this).apply {
            text = "تفعيل التحكم اللمسي"
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                status.text = "فعّل RemoteAssist Control من إعدادات Accessibility، ثم ارجع للتطبيق."
            }
        }

        val viewerButton = Button(this).apply {
            text = "مشاهدة/تحكم"
            setOnClickListener { startViewerFlow() }
        }

        val stopButton = Button(this).apply {
            text = "إيقاف الاتصال"
            setOnClickListener {
                stopService(Intent(this@MainActivity, ScreenShareService::class.java).setAction(ScreenShareService.ACTION_STOP))
                viewerSocket?.close(1000, "user stop")
                viewerSocket = null
                status.text = "تم الإيقاف."
            }
        }

        status = TextView(this).apply {
            text = "جاهز."
            textSize = 14f
            setPadding(0, 16, 0, 16)
        }

        preview = ImageView(this).apply {
            setBackgroundColor(0xFFE5E7EB.toInt())
            scaleType = ImageView.ScaleType.FIT_XY
            adjustViewBounds = true
            minimumHeight = 620
            setOnTouchListener { view, event ->
                if (event.action == MotionEvent.ACTION_UP && viewerSocket != null) {
                    val x = (event.x / view.width).coerceIn(0f, 1f)
                    val y = (event.y / view.height).coerceIn(0f, 1f)
                    val msg = JSONObject()
                        .put("type", "tap")
                        .put("code", codeInput.text.toString().trim())
                        .put("x", x)
                        .put("y", y)
                    viewerSocket?.send(msg.toString())
                    status.text = String.format(Locale.US, "تم إرسال لمسة: %.2f, %.2f", x, y)
                    true
                } else false
            }
        }

        root.addView(title, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        root.addView(subtitle, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        root.addView(serverInput, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        root.addView(codeInput, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        root.addView(shareButton, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        root.addView(accessibilityButton, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        root.addView(viewerButton, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        root.addView(stopButton, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        root.addView(status, LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        root.addView(preview, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
    }

    private fun startHostFlow() {
        val serverUrl = serverInput.text.toString().trim()
        if (!serverUrl.startsWith("ws://") && !serverUrl.startsWith("wss://")) {
            status.text = "أدخل رابط WebSocket صحيح يبدأ بـ ws:// أو wss://"
            return
        }
        pendingSessionCode = generateSessionCode()
        codeInput.setText(pendingSessionCode)
        status.text = "رمز الجلسة: $pendingSessionCode — وافق على مشاركة الشاشة من نافذة Android."
        val mgr = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        startActivityForResult(mgr.createScreenCaptureIntent(), screenCaptureRequest)
    }

    @Deprecated("Deprecated in platform, kept for minSdk compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == screenCaptureRequest) {
            if (resultCode == RESULT_OK && data != null) {
                val service = Intent(this, ScreenShareService::class.java)
                    .putExtra(ScreenShareService.EXTRA_RESULT_CODE, resultCode)
                    .putExtra(ScreenShareService.EXTRA_DATA, data)
                    .putExtra(ScreenShareService.EXTRA_SERVER_URL, serverInput.text.toString().trim())
                    .putExtra(ScreenShareService.EXTRA_SESSION_CODE, pendingSessionCode)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(service) else startService(service)
                status.text = "المشاركة تعمل. أعطِ الرمز للهاتف الآخر: $pendingSessionCode"
            } else {
                status.text = "تم إلغاء مشاركة الشاشة."
            }
        }
    }

    private fun startViewerFlow() {
        val serverUrl = serverInput.text.toString().trim()
        val code = codeInput.text.toString().trim()
        if ((!serverUrl.startsWith("ws://") && !serverUrl.startsWith("wss://")) || code.length < 4) {
            status.text = "أدخل رابط السيرفر ورمز الجلسة الصحيح."
            return
        }
        viewerSocket?.close(1000, "new viewer")
        val client = OkHttpClient.Builder()
            .pingInterval(20, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
        val request = Request.Builder().url(serverUrl).build()
        viewerSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                val join = JSONObject()
                    .put("type", "join")
                    .put("role", "viewer")
                    .put("code", code)
                webSocket.send(join.toString())
                runOnUiThread { status.text = "متصل كجهاز مشاهدة. انتظر ظهور الشاشة." }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                val msg = runCatching { JSONObject(text) }.getOrNull() ?: return
                if (msg.optString("type") == "frame") {
                    val bytes = Base64.decode(msg.optString("jpeg"), Base64.NO_WRAP)
                    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    runOnUiThread {
                        preview.setImageBitmap(bitmap)
                        status.text = "البث يعمل — اضغط على الصورة لإرسال لمسة للهاتف الآخر."
                    }
                } else if (msg.optString("type") == "error") {
                    runOnUiThread { status.text = "خطأ: ${msg.optString("message")}" }
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                runOnUiThread { status.text = "فشل الاتصال: ${t.message}" }
            }
        })
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 77)
        }
    }

    private fun generateSessionCode(): String = (100000 + Random().nextInt(900000)).toString()
}
