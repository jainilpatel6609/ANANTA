package com.ananta.app

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status

/**
 * Android SMS User Consent API.
 *
 * start() waits for the next incoming SMS and asks the user (system dialog) whether this app may read that one
 * message. It resolves with the full SMS text, or rejects with code TIMEOUT / DENIED / CANCELLED / UNAVAILABLE.
 * No READ_SMS / RECEIVE_SMS permission is required.
 */
class SmsConsentModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var receiver: BroadcastReceiver? = null
    private var pending: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "SmsConsent"

    @ReactMethod
    fun start(promise: Promise) {
        cancelInternal("CANCELLED", "A newer OTP request replaced this one.")
        pending = promise

        val smsReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (SmsRetriever.SMS_RETRIEVED_ACTION != intent.action) return
                val status = intent.extras?.get(SmsRetriever.EXTRA_STATUS) as? Status ?: return
                when (status.statusCode) {
                    CommonStatusCodes.SUCCESS -> {
                        @Suppress("DEPRECATION")
                        val consentIntent: Intent? = intent.extras?.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT)
                        val activity = reactContext.currentActivity
                        if (consentIntent == null || activity == null) {
                            finishWithError("UNAVAILABLE", "Unable to show the SMS consent dialog.")
                        } else {
                            try {
                                activity.startActivityForResult(consentIntent, REQUEST_CODE)
                            } catch (e: Exception) {
                                finishWithError("UNAVAILABLE", e.message ?: "Unable to show the SMS consent dialog.")
                            }
                        }
                    }
                    CommonStatusCodes.TIMEOUT -> finishWithError("TIMEOUT", "No OTP SMS arrived in time.")
                    else -> finishWithError("UNAVAILABLE", "SMS listener failed (${status.statusCode}).")
                }
            }
        }
        receiver = smsReceiver

        try {
            val filter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Must be exported: Google Play services delivers the broadcast (protected by SEND_PERMISSION).
                reactContext.registerReceiver(smsReceiver, filter, SmsRetriever.SEND_PERMISSION, null, Context.RECEIVER_EXPORTED)
            } else {
                reactContext.registerReceiver(smsReceiver, filter, SmsRetriever.SEND_PERMISSION, null)
            }
            // null sender = accept the OTP SMS from any sender (the backend's SMS gateway sender id varies).
            SmsRetriever.getClient(reactContext).startSmsUserConsent(null)
                .addOnFailureListener { e ->
                    finishWithError("UNAVAILABLE", e.message ?: "Google Play services SMS API is unavailable.")
                }
        } catch (e: Exception) {
            finishWithError("UNAVAILABLE", e.message ?: "Unable to start the SMS listener.")
        }
    }

    @ReactMethod
    fun stop() {
        cancelInternal("CANCELLED", "OTP listening was cancelled.")
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_CODE) return
        if (resultCode == Activity.RESULT_OK && data != null) {
            val message = data.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
            if (message != null) {
                finishWithSuccess(message)
                return
            }
        }
        finishWithError("DENIED", "The user declined to share the OTP SMS.")
    }

    override fun onNewIntent(intent: Intent) {}

    override fun invalidate() {
        cancelInternal("CANCELLED", "App reloaded.")
        reactContext.removeActivityEventListener(this)
        super.invalidate()
    }

    private fun unregister() {
        receiver?.let {
            try {
                reactContext.unregisterReceiver(it)
            } catch (_: IllegalArgumentException) {
            }
        }
        receiver = null
    }

    private fun finishWithSuccess(message: String) {
        unregister()
        pending?.resolve(message)
        pending = null
    }

    private fun finishWithError(code: String, message: String) {
        unregister()
        pending?.reject(code, message)
        pending = null
    }

    private fun cancelInternal(code: String, message: String) {
        if (pending != null || receiver != null) finishWithError(code, message)
    }

    companion object {
        private const val REQUEST_CODE = 5391
    }
}
