package com.lessonreport.saas.api

import com.lessonreport.saas.domain.ReportShare
import com.lessonreport.saas.repository.ReportRepository
import com.lessonreport.saas.repository.ReportShareRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class ShareController(
    private val reportRepository: ReportRepository,
    private val reportShareRepository: ReportShareRepository,
    private val instructorContext: InstructorContext,
    @Value("\${app.share-base-url:http://localhost:18080/api/v1/share}")
    private val shareBaseUrl: String
) {
    @PostMapping("/reports/{reportId}/share")
    fun createShare(
        @PathVariable reportId: UUID,
        @Valid @RequestBody(required = false) request: ShareCreateRequest?
    ): ShareResponse {
        val instructorId = instructorContext.currentInstructorId()
        val report = reportRepository.findByIdAndInstructorId(reportId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found")

        val share = reportShareRepository.findTopByReportIdAndRevokedFalseOrderByCreatedAtDesc(reportId) ?: ReportShare()

        val expireHours = request?.expireHours ?: 72
        val token = UUID.randomUUID().toString().replace("-", "")

        share.report = report
        share.token = token
        share.revoked = false
        share.viewCount = 0
        share.lastViewedAt = null
        share.expiresAt = Instant.now().plusSeconds(expireHours * 3600L)

        val saved = reportShareRepository.save(share)
        return ShareResponse(
            token = saved.token!!,
            shareUrl = "$shareBaseUrl/${saved.token}",
            expiresAt = saved.expiresAt!!
        )
    }

    @GetMapping("/share/{token}")
    @Transactional
    fun openShare(@PathVariable token: String): PublicShareResponse {
        val share = reportShareRepository.findByToken(token)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found")

        if (share.revoked || share.expiresAt!!.isBefore(Instant.now())) {
            throw ResponseStatusException(HttpStatus.GONE, "Share link expired")
        }

        share.viewCount += 1
        share.lastViewedAt = Instant.now()

        val report = share.report!!
        return PublicShareResponse(
            clientName = report.client!!.name!!,
            sessionDate = report.session!!.sessionDate!!,
            summaryItems = report.summaryItems,
            strengthNote = report.strengthNote,
            improveNote = report.improveNote,
            nextGoal = report.nextGoal,
            homework = report.homework,
            painChange = report.painChange,
            expiresAt = share.expiresAt!!,
            viewCount = share.viewCount
        )
    }
}

data class ShareCreateRequest(
    @field:Min(1) @field:Max(720) val expireHours: Int? = null
)

data class ShareResponse(
    val token: String,
    val shareUrl: String,
    val expiresAt: Instant
)

data class PublicShareResponse(
    val clientName: String,
    val sessionDate: LocalDate,
    val summaryItems: String?,
    val strengthNote: String?,
    val improveNote: String?,
    val nextGoal: String?,
    val homework: String?,
    val painChange: String?,
    val expiresAt: Instant,
    val viewCount: Int
)
