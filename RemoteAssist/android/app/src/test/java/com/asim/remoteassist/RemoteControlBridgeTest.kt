package com.asim.remoteassist

import org.junit.Assert.assertFalse
import org.junit.Test

class RemoteControlBridgeTest {

    @Test
    fun isReadyIsFalseWhenNoAccessibilityServiceIsBound() {
        assertFalse(RemoteControlBridge.isReady())
    }

    @Test
    fun tapDoesNotThrowWhenNoAccessibilityServiceIsBound() {
        // ScreenShareService forwards viewer taps here as soon as they arrive over the
        // network, before the host has necessarily enabled the Accessibility service.
        RemoteControlBridge.tap(0.5f, 0.5f)
    }

    @Test
    fun swipeDoesNotThrowWhenNoAccessibilityServiceIsBound() {
        RemoteControlBridge.swipe(0f, 0f, 1f, 1f)
    }
}
