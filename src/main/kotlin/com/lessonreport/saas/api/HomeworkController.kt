package com.lessonreport.saas.api

import com.lessonreport.saas.domain.HomeworkAssignment
import com.lessonreport.saas.repository.ClientRepository
import com.lessonreport.saas.repository.HomeworkAssignmentRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
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
@RequestMapping("/api/v1/clients/{clientId}/homeworks")
class HomeworkController(
    private val clientRepository: ClientRepository,
    private val homeworkAssignmentRepository: HomeworkAssignmentRepository,
    private val instructorContext: InstructorContext
) {
    @GetMapping
    fun list(@PathVariable clientId: UUID): List<HomeworkResponse> {
        val instructorId = instructorContext.currentInstructorId()
        ensureOwnedClient(clientId, instructorId)
        return homeworkAssignmentRepository.findByClientIdAndInstructorIdOrderByCreatedAtDesc(clientId, instructorId)
            .map { it.toResponse() }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@PathVariable clientId: UUID, @Valid @RequestBody request: HomeworkCreateRequest): HomeworkResponse {
        val instructor = instructorContext.currentInstructor()
        val client = ensureOwnedClient(clientId, instructor.id!!)
        val row = HomeworkAssignment(
            instructor = instructor,
            client = client,
            content = request.content.trim(),
            remindAt = request.remindAt,
            completed = false
        )
        return homeworkAssignmentRepository.save(row).toResponse()
    }

    private fun ensureOwnedClient(clientId: UUID, instructorId: UUID) =
        clientRepository.findByIdAndInstructorId(clientId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found")

    private fun HomeworkAssignment.toResponse() = HomeworkResponse(
        id = id!!,
        content = content!!,
        remindAt = remindAt,
        notifiedAt = notifiedAt,
        completed = completed,
        createdAt = createdAt ?: Instant.now()
    )
}

data class HomeworkCreateRequest(
    @field:NotBlank @field:Size(max = 1000) val content: String,
    val remindAt: Instant? = null
)

data class HomeworkResponse(
    val id: UUID,
    val content: String,
    val remindAt: Instant?,
    val notifiedAt: Instant?,
    val completed: Boolean,
    val createdAt: Instant
)
