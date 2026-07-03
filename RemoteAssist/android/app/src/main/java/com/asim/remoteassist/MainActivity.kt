package com.asim.remoteassist

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.media.projection.MediaProjectionManager
import android.net.Uri
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
        root.addView(preview, LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f)
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

    private fun generateSessionCode(): String = (100000 + Random().nextInt(900000)).toString()

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 77)
        }
    }
}
