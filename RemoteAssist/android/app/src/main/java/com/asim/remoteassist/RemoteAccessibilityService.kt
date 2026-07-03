package com.asim.remoteassist

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent

class RemoteAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        RemoteControlBridge.bind(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        RemoteControlBridge.unbind(this)
        super.onDestroy()
    }

    fun performTap(xRatio: Float, yRatio: Float) {
        val dm = resources.displayMetrics
        val x = xRatio * dm.widthPixels
        val y = yRatio * dm.heightPixels
        val path = Path().apply { moveTo(x, y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0L, 80L))
            .build()
        dispatchGesture(gesture, null, null)
    }

    fun performSwipe(fromX: Float, fromY: Float, toX: Float, toY: Float, durationMs: Long) {
        val dm = resources.displayMetrics
        val path = Path().apply {
            moveTo(fromX * dm.widthPixels, fromY * dm.heightPixels)
            lineTo(toX * dm.widthPixels, toY * dm.heightPixels)
        }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0L, durationMs))
            .build()
        dispatchGesture(gesture, null, null)
    }
}
