package com.lessonreport.saas.api

import com.lessonreport.saas.domain.ClientProfile
import com.lessonreport.saas.repository.ClientProfileRepository
import com.lessonreport.saas.repository.ClientRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.Size
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import org.springframework.http.HttpStatus
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/clients/{clientId}/profile")
class ClientProfileController(
    private val clientRepository: ClientRepository,
    private val clientProfileRepository: ClientProfileRepository,
    private val instructorContext: InstructorContext
) {
    @GetMapping
    fun get(@PathVariable clientId: UUID): ClientProfileResponse {
        val client = findOwnedClient(clientId)
        val profile = clientProfileRepository.findByClientId(client.id!!) ?: ClientProfile(client = client)
        return profile.toResponse(client.id!!)
    }

    @PutMapping
    fun upsert(@PathVariable clientId: UUID, @Valid @RequestBody request: ClientProfileUpsertRequest): ClientProfileResponse {
        val client = findOwnedClient(clientId)
        val profile = clientProfileRepository.findByClientId(client.id!!) ?: ClientProfile(client = client)
        profile.painNote = request.painNote
        profile.goalNote = request.goalNote
        profile.surgeryHistory = request.surgeryHistory
        profile.beforeClassMemo = request.beforeClassMemo
        profile.afterClassMemo = request.afterClassMemo
        profile.nextLessonPlan = request.nextLessonPlan
        return clientProfileRepository.save(profile).toResponse(client.id!!)
    }

    private fun findOwnedClient(clientId: UUID) =
        clientRepository.findByIdAndInstructorId(clientId, instructorContext.currentInstructorId())
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found")

    private fun ClientProfile.toResponse(clientId: UUID) = ClientProfileResponse(
        clientId = clientId,
        painNote = painNote,
        goalNote = goalNote,
        surgeryHistory = surgeryHistory,
        beforeClassMemo = beforeClassMemo,
        afterClassMemo = afterClassMemo,
        nextLessonPlan = nextLessonPlan,
        updatedAt = updatedAt ?: Instant.now()
    )
}

data class ClientProfileUpsertRequest(
    @field:Size(max = 1000) val painNote: String? = null,
    @field:Size(max = 1000) val goalNote: String? = null,
    @field:Size(max = 1000) val surgeryHistory: String? = null,
    @field:Size(max = 1000) val beforeClassMemo: String? = null,
    @field:Size(max = 1000) val afterClassMemo: String? = null,
    @field:Size(max = 1000) val nextLessonPlan: String? = null
)

data class ClientProfileResponse(
    val clientId: UUID,
    val painNote: String?,
    val goalNote: String?,
    val surgeryHistory: String?,
    val beforeClassMemo: String?,
    val afterClassMemo: String?,
    val nextLessonPlan: String?,
    val updatedAt: Instant
)
