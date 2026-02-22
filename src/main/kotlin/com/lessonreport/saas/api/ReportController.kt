package com.lessonreport.saas.api

import com.lessonreport.saas.domain.Report
import com.lessonreport.saas.repository.LessonSessionRepository
import com.lessonreport.saas.repository.ReportRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class ReportController(
    private val reportRepository: ReportRepository,
    private val sessionRepository: LessonSessionRepository,
    private val instructorContext: InstructorContext
) {
    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: ReportCreateRequest): ReportResponse {
        val instructorId = instructorContext.currentInstructorId()
        val session = sessionRepository.findByIdAndInstructorId(request.sessionId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found")

        if (reportRepository.findBySessionId(session.id!!) != null) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Report already exists for this session")
        }

        val report = Report(
            instructor = instructorContext.currentInstructor(),
            client = session.client,
            session = session,
            summaryItems = request.summaryItems,
            strengthNote = request.strengthNote,
            improveNote = request.improveNote,
            nextGoal = request.nextGoal,
            homework = request.homework,
            painChange = request.painChange
        )

        return reportRepository.save(report).toResponse()
    }

    @GetMapping("/reports/{reportId}")
    fun get(@PathVariable reportId: UUID): ReportResponse {
        val instructorId = instructorContext.currentInstructorId()
        val report = reportRepository.findByIdAndInstructorId(reportId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found")
        return report.toResponse()
    }

    @GetMapping("/clients/{clientId}/reports")
    fun listClientReports(@PathVariable clientId: UUID, @RequestParam(defaultValue = "20") limit: Int): List<ReportResponse> {
        val instructorId = instructorContext.currentInstructorId()
        val safeLimit = limit.coerceIn(1, 100)
        return reportRepository.findByClientIdAndInstructorIdOrderByCreatedAtDesc(
            clientId,
            instructorId,
            PageRequest.of(0, safeLimit)
        ).map { it.toResponse() }
    }

    @PatchMapping("/reports/{reportId}")
    fun update(@PathVariable reportId: UUID, @Valid @RequestBody request: ReportUpdateRequest): ReportResponse {
        val instructorId = instructorContext.currentInstructorId()
        val report = reportRepository.findByIdAndInstructorId(reportId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found")

        request.summaryItems?.let { report.summaryItems = it }
        request.strengthNote?.let { report.strengthNote = it }
        request.improveNote?.let { report.improveNote = it }
        request.nextGoal?.let { report.nextGoal = it }
        request.homework?.let { report.homework = it }
        request.painChange?.let { report.painChange = it }

        return reportRepository.save(report).toResponse()
    }

    private fun Report.toResponse() = ReportResponse(
        id = id!!,
        clientId = client!!.id!!,
        sessionId = session!!.id!!,
        summaryItems = summaryItems,
        strengthNote = strengthNote,
        improveNote = improveNote,
        nextGoal = nextGoal,
        homework = homework,
        painChange = painChange,
        createdAt = createdAt ?: Instant.now(),
        updatedAt = updatedAt ?: Instant.now()
    )
}

data class ReportCreateRequest(
    @field:NotNull val sessionId: UUID,
    @field:Size(max = 1000) val summaryItems: String? = null,
    @field:Size(max = 1000) val strengthNote: String? = null,
    @field:Size(max = 1000) val improveNote: String? = null,
    @field:Size(max = 500) val nextGoal: String? = null,
    @field:Size(max = 1000) val homework: String? = null,
    @field:Size(max = 500) val painChange: String? = null
)

data class ReportUpdateRequest(
    @field:Size(max = 1000) val summaryItems: String? = null,
    @field:Size(max = 1000) val strengthNote: String? = null,
    @field:Size(max = 1000) val improveNote: String? = null,
    @field:Size(max = 500) val nextGoal: String? = null,
    @field:Size(max = 1000) val homework: String? = null,
    @field:Size(max = 500) val painChange: String? = null
)

data class ReportResponse(
    val id: UUID,
    val clientId: UUID,
    val sessionId: UUID,
    val summaryItems: String?,
    val strengthNote: String?,
    val improveNote: String?,
    val nextGoal: String?,
    val homework: String?,
    val painChange: String?,
    val createdAt: Instant,
    val updatedAt: Instant
)
