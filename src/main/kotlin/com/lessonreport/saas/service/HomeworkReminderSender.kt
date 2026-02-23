package com.lessonreport.saas.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Instant

@Component
class HomeworkReminderSender(
    @Value("\${app.notifications.webhook-url:}")
    private val webhookUrl: String
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val httpClient: HttpClient = HttpClient.newHttpClient()

    fun send(clientName: String, content: String, remindAt: Instant?): Boolean {
        // Always emit server log reminder.
        log.info("[HOMEWORK_REMINDER] client='{}' remindAt='{}' content='{}'", clientName, remindAt, content)

        if (webhookUrl.isBlank()) return true

        val body = """{"type":"homework_reminder","clientName":"${escape(clientName)}","content":"${escape(content)}","remindAt":"${remindAt ?: ""}"}"""
        return try {
            val request = HttpRequest.newBuilder(URI.create(webhookUrl))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build()
            val resp = httpClient.send(request, HttpResponse.BodyHandlers.ofString())
            resp.statusCode() in 200..299
        } catch (e: Exception) {
            log.warn("Failed to send homework reminder webhook: {}", e.message)
            false
        }
    }

    private fun escape(v: String): String = v.replace("\\", "\\\\").replace("\"", "\\\"")
}
