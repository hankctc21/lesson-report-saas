package com.lessonreport.saas.api

import com.lessonreport.saas.domain.ClientTrackingLog
import com.lessonreport.saas.repository.ClientRepository
import com.lessonreport.saas.repository.ClientTrackingLogRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/clients/{clientId}/tracking-logs")
class ClientTrackingLogController(
    private val clientRepository: ClientRepository,
    private val clientTrackingLogRepository: ClientTrackingLogRepository,
    private val instructorContext: InstructorContext
) {
    @GetMapping
    fun list(@PathVariable clientId: UUID): List<ClientTrackingLogResponse> {
        val instructorId = instructorContext.currentInstructorId()
        ensureOwnedClient(clientId, instructorId)
        return clientTrackingLogRepository
            .findByClientIdAndInstructorIdOrderByCreatedAtDesc(clientId, instructorId)
            .map { it.toResponse() }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@PathVariable clientId: UUID, @Valid @RequestBody request: ClientTrackingLogCreateRequest): ClientTrackingLogResponse {
        val instructor = instructorContext.currentInstructor()
        val client = ensureOwnedClient(clientId, instructor.id!!)
        val row = ClientTrackingLog(
            instructor = instructor,
            client = client,
            painNote = request.painNote,
            goalNote = request.goalNote,
            surgeryHistory = request.surgeryHistory,
            beforeClassMemo = request.beforeClassMemo,
            afterClassMemo = request.afterClassMemo,
            nextLessonPlan = request.nextLessonPlan,
            homeworkGiven = request.homeworkGiven,
            homeworkReminderAt = request.homeworkReminderAt
        )
        return clientTrackingLogRepository.save(row).toResponse()
    }

    private fun ensureOwnedClient(clientId: UUID, instructorId: UUID) =
        clientRepository.findByIdAndInstructorId(clientId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found")

    private fun ClientTrackingLog.toResponse() = ClientTrackingLogResponse(
        id = id!!,
        painNote = painNote,
        goalNote = goalNote,
        surgeryHistory = surgeryHistory,
        beforeClassMemo = beforeClassMemo,
        afterClassMemo = afterClassMemo,
        nextLessonPlan = nextLessonPlan,
        homeworkGiven = homeworkGiven,
        homeworkReminderAt = homeworkReminderAt,
        createdAt = createdAt ?: Instant.now()
    )
}

data class ClientTrackingLogCreateRequest(
    @field:Size(max = 1000) val painNote: String? = null,
    @field:Size(max = 1000) val goalNote: String? = null,
    @field:Size(max = 1000) val surgeryHistory: String? = null,
    @field:Size(max = 1000) val beforeClassMemo: String? = null,
    @field:Size(max = 1000) val afterClassMemo: String? = null,
    @field:Size(max = 1000) val nextLessonPlan: String? = null,
    @field:Size(max = 1000) val homeworkGiven: String? = null,
    val homeworkReminderAt: Instant? = null
)

data class ClientTrackingLogResponse(
    val id: UUID,
    val painNote: String?,
    val goalNote: String?,
    val surgeryHistory: String?,
    val beforeClassMemo: String?,
    val afterClassMemo: String?,
    val nextLessonPlan: String?,
    val homeworkGiven: String?,
    val homeworkReminderAt: Instant?,
    val createdAt: Instant
)

