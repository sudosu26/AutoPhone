package com.phonepilot.app.data.api

import com.phonepilot.app.data.model.ApiResponse
import com.phonepilot.app.data.model.DeviceStatus
import com.phonepilot.app.data.model.ExecutionRecord
import com.phonepilot.app.data.model.HealthResponse
import com.phonepilot.app.data.model.HeartbeatRequest
import com.phonepilot.app.data.model.Task
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface PhonePilotApi {

    @GET("api/health")
    suspend fun checkHealth(): Response<ApiResponse<HealthResponse>>

    @GET("api/device/status")
    suspend fun getDeviceStatus(): Response<ApiResponse<DeviceStatus>>

    @POST("api/device/heartbeat")
    suspend fun sendHeartbeat(@Body heartbeat: HeartbeatRequest): Response<ApiResponse<Unit>>

    @GET("api/tasks")
    suspend fun getTasks(): Response<ApiResponse<List<Task>>>

    @GET("api/tasks/{id}")
    suspend fun getTask(@Path("id") taskId: String): Response<ApiResponse<Task>>

    @POST("api/tasks")
    suspend fun createTask(@Body task: Task): Response<ApiResponse<Task>>

    @PUT("api/tasks/{id}")
    suspend fun updateTask(
        @Path("id") taskId: String,
        @Body task: Task
    ): Response<ApiResponse<Task>>

    @DELETE("api/tasks/{id}")
    suspend fun deleteTask(@Path("id") taskId: String): Response<ApiResponse<Unit>>

    @POST("api/tasks/{id}/run")
    suspend fun runTask(@Path("id") taskId: String): Response<ApiResponse<ExecutionRecord>>

    @POST("api/tasks/{id}/stop")
    suspend fun stopTask(@Path("id") taskId: String): Response<ApiResponse<Unit>>

    @GET("api/history")
    suspend fun getExecutionHistory(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 50,
        @Query("taskId") taskId: String? = null
    ): Response<ApiResponse<List<ExecutionRecord>>>

    @DELETE("api/history")
    suspend fun clearExecutionHistory(): Response<ApiResponse<Unit>>
}
