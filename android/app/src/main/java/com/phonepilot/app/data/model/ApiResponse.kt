package com.phonepilot.app.data.model

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean = true,
    @SerializedName("message") val message: String? = null,
    @SerializedName("data") val data: T? = null,
    @SerializedName("error") val error: String? = null,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis()
)

sealed class NetworkResult<out T> {
    data class Success<out T>(val data: T, val message: String? = null) : NetworkResult<T>()
    data class Error(val code: Int, val message: String) : NetworkResult<Nothing>()
    data class Exception(val throwable: Throwable) : NetworkResult<Nothing>()

    val isSuccess: Boolean get() = this is Success
    fun getOrNull(): T? = if (this is Success) data else null
}
