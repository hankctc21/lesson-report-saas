package com.lessonreport.saas.api

import com.lessonreport.saas.domain.LessonSession
import com.lessonreport.saas.domain.SessionType
import com.lessonreport.saas.repository.ClientRepository
import com.lessonreport.saas.repository.LessonSessionRepository
import com.lessonreport.saas.repository.ReportRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/api/v1/sessions")
class SessionController(
    private val sessionRepository: LessonSessionRepository,
    private val clientRepository: ClientRepository,
    private val reportRepository: ReportRepository,
    private val instructorContext: InstructorContext
) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: SessionCreateRequest): SessionResponse {
        val instructorId = instructorContext.currentInstructorId()
        val client = clientRepository.findByIdAndInstructorId(request.clientId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found")

        val session = LessonSession(
            instructor = instructorContext.currentInstructor(),
            client = client,
            sessionDate = request.date,
            sessionType = request.type,
            memo = request.memo
        )

        return sessionRepository.save(session).toResponse()
    }

    @GetMapping
    fun listByDate(@RequestParam date: LocalDate): List<SessionResponse> {
        val instructorId = instructorContext.currentInstructorId()
        return sessionRepository.findByInstructorIdAndSessionDateOrderByCreatedAtDesc(instructorId, date)
            .map { it.toResponse() }
    }

    @GetMapping("/with-report")
    fun listByDateWithReport(@RequestParam date: LocalDate): List<SessionWithReportStatusResponse> {
        val instructorId = instructorContext.currentInstructorId()
        return sessionRepository.findByInstructorIdAndSessionDateOrderByCreatedAtDesc(instructorId, date)
            .map {
                SessionWithReportStatusResponse(
                    id = it.id!!,
                    clientId = it.client!!.id!!,
                    date = it.sessionDate!!,
                    type = it.sessionType!!,
                    memo = it.memo,
                    createdAt = it.createdAt ?: Instant.now(),
                    hasReport = reportRepository.findBySessionId(it.id!!) != null
                )
            }
    }

    private fun LessonSession.toResponse() = SessionResponse(
        id = id!!,
        clientId = client!!.id!!,
        date = sessionDate!!,
        type = sessionType!!,
        memo = memo,
        createdAt = createdAt ?: Instant.now()
    )
}

data class SessionCreateRequest(
    @field:NotNull val clientId: UUID,
    @field:NotNull val date: LocalDate,
    @field:NotNull val type: SessionType,
    @field:Size(max = 500) val memo: String? = null
)

data class SessionResponse(
    val id: UUID,
    val clientId: UUID,
    val date: LocalDate,
    val type: SessionType,
    val memo: String?,
    val createdAt: Instant
)

data class SessionWithReportStatusResponse(
    val id: UUID,
    val clientId: UUID,
    val date: LocalDate,
    val type: SessionType,
    val memo: String?,
    val createdAt: Instant,
    val hasReport: Boolean
)
