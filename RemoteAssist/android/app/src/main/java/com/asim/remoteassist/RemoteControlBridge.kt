package com.asim.remoteassist

import java.lang.ref.WeakReference

object RemoteControlBridge {
    private var serviceRef: WeakReference<RemoteAccessibilityService>? = null

    fun bind(service: RemoteAccessibilityService) {
        serviceRef = WeakReference(service)
    }

    fun unbind(service: RemoteAccessibilityService) {
        if (serviceRef?.get() === service) serviceRef = null
    }

    fun isReady(): Boolean = serviceRef?.get() != null

    fun tap(xRatio: Float, yRatio: Float) {
        serviceRef?.get()?.performTap(xRatio.coerceIn(0f, 1f), yRatio.coerceIn(0f, 1f))
    }

    fun swipe(fromX: Float, fromY: Float, toX: Float, toY: Float, durationMs: Long = 350L) {
        serviceRef?.get()?.performSwipe(
            fromX.coerceIn(0f, 1f),
            fromY.coerceIn(0f, 1f),
            toX.coerceIn(0f, 1f),
            toY.coerceIn(0f, 1f),
            durationMs.coerceIn(100L, 1200L)
        )
    }
}
