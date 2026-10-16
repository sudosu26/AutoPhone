package com.phonepilot.app.data.api

import android.content.Context
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.phonepilot.app.data.model.ApiResponse
import com.phonepilot.app.data.model.ConnectivityTestResult
import com.phonepilot.app.data.model.NetworkResult
import com.phonepilot.app.util.AppPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

class ApiClient private constructor(private val context: Context) {

    private val preferences = AppPreferences.getInstance(context)

    val gson: Gson = GsonBuilder()
        .setLenient()
        .create()

    // Dynamic Host Interceptor allows the backend URL to be updated in Settings
    // without having to restart the entire application or rebuild OkHttp/Retrofit singletons.
    private val dynamicHostInterceptor = Interceptor { chain ->
        var originalRequest: Request = chain.request()
        val configuredUrlStr = preferences.backendUrl.trim()
        val targetHttpUrl = configuredUrlStr.toHttpUrlOrNull()

        if (targetHttpUrl != null) {
            val newHttpUrl = originalRequest.url.newBuilder()
                .scheme(targetHttpUrl.scheme)
                .host(targetHttpUrl.host)
                .port(targetHttpUrl.port)
                .build()

            val requestBuilder = originalRequest.newBuilder().url(newHttpUrl)

            // Auth Interceptor: Attach API Key if configured
            val apiKey = preferences.apiKey.trim()
            if (apiKey.isNotEmpty()) {
                requestBuilder.header("X-API-Key", apiKey)
                requestBuilder.header("Authorization", "Bearer $apiKey")
            }
            requestBuilder.header("User-Agent", "PhonePilot-Android/1.0.0")

            originalRequest = requestBuilder.build()
        }

        chain.proceed(originalRequest)
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(dynamicHostInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    // Using a placeholder base URL because dynamicHostInterceptor rewrites the scheme, host, and port
    private val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl("http://127.0.0.1:8000/")
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()

    val api: PhonePilotApi = retrofit.create(PhonePilotApi::class.java)

    suspend fun <T> safeApiCall(call: suspend () -> Response<ApiResponse<T>>): NetworkResult<T> {
        return withContext(Dispatchers.IO) {
            try {
                val response = call()
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success && body.data != null) {
                        NetworkResult.Success(body.data, body.message)
                    } else if (body != null && body.data != null) {
                        NetworkResult.Success(body.data, body.message)
                    } else if (body != null && body.success) {
                        @Suppress("UNCHECKED_CAST")
                        NetworkResult.Success(Unit as T, body.message)
                    } else {
                        NetworkResult.Error(
                            code = response.code(),
                            message = body?.error ?: body?.message ?: "Unknown server response"
                        )
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    NetworkResult.Error(
                        code = response.code(),
                        message = errorBody ?: "HTTP ${response.code()}: ${response.message()}"
                    )
                }
            } catch (e: IOException) {
                NetworkResult.Exception(e)
            } catch (e: Exception) {
                NetworkResult.Exception(e)
            }
        }
    }

    suspend fun testConnectivity(): ConnectivityTestResult {
        return withContext(Dispatchers.IO) {
            val startTime = System.currentTimeMillis()
            val targetUrl = preferences.backendUrl
            try {
                val response = api.checkHealth()
                val latency = System.currentTimeMillis() - startTime
                if (response.isSuccessful) {
                    ConnectivityTestResult(
                        isSuccess = true,
                        latencyMs = latency,
                        statusCode = response.code(),
                        responseMessage = "Health check OK: ${response.body()?.data?.status ?: "online"}",
                        endpointTested = targetUrl
                    )
                } else {
                    ConnectivityTestResult(
                        isSuccess = false,
                        latencyMs = latency,
                        statusCode = response.code(),
                        responseMessage = "Server returned HTTP ${response.code()}",
                        endpointTested = targetUrl
                    )
                }
            } catch (e: Exception) {
                val latency = System.currentTimeMillis() - startTime
                ConnectivityTestResult(
                    isSuccess = false,
                    latencyMs = latency,
                    statusCode = 0,
                    responseMessage = e.message ?: "Failed to connect to backend",
                    endpointTested = targetUrl
                )
            }
        }
    }

    companion object {
        @Volatile
        private var instance: ApiClient? = null

        fun getInstance(context: Context): ApiClient {
            return instance ?: synchronized(this) {
                instance ?: ApiClient(context.applicationContext).also { instance = it }
            }
        }
    }
}
