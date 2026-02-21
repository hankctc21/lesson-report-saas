package com.lessonreport.saas.api

import com.lessonreport.saas.domain.Client
import com.lessonreport.saas.repository.ClientRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/clients")
class ClientController(
    private val clientRepository: ClientRepository,
    private val instructorContext: InstructorContext
) {
    @GetMapping
    fun list(): List<ClientResponse> {
        val instructorId = instructorContext.currentInstructorId()
        return clientRepository.findByInstructorIdOrderByCreatedAtDesc(instructorId).map { it.toResponse() }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: ClientCreateRequest): ClientResponse {
        val client = Client(
            instructor = instructorContext.currentInstructor(),
            name = requireName(request.name),
            phone = request.phone,
            flagsNote = request.flagsNote,
            note = request.note
        )
        return clientRepository.save(client).toResponse()
    }

    @GetMapping("/{clientId}")
    fun get(@PathVariable clientId: UUID): ClientResponse = findOwnedClient(clientId).toResponse()

    @PatchMapping("/{clientId}")
    fun update(@PathVariable clientId: UUID, @Valid @RequestBody request: ClientUpdateRequest): ClientResponse {
        val client = findOwnedClient(clientId)

        request.name?.let { client.name = requireName(it) }
        request.phone?.let { client.phone = it }
        request.flagsNote?.let { client.flagsNote = it }
        request.note?.let { client.note = it }

        return clientRepository.save(client).toResponse()
    }

    private fun findOwnedClient(clientId: UUID): Client {
        val instructorId = instructorContext.currentInstructorId()
        return clientRepository.findByIdAndInstructorId(clientId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found")
    }

    private fun requireName(name: String): String {
        if (name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Client name is required")
        }
        return name.trim()
    }

    private fun Client.toResponse() = ClientResponse(
        id = id!!,
        name = name!!,
        phone = phone,
        flagsNote = flagsNote,
        note = note,
        createdAt = createdAt ?: Instant.now()
    )
}

data class ClientCreateRequest(
    @field:NotBlank @field:Size(max = 80) val name: String,
    @field:Size(max = 40) val phone: String? = null,
    @field:Size(max = 500) val flagsNote: String? = null,
    @field:Size(max = 1000) val note: String? = null
)

data class ClientUpdateRequest(
    @field:Size(max = 80) val name: String? = null,
    @field:Size(max = 40) val phone: String? = null,
    @field:Size(max = 500) val flagsNote: String? = null,
    @field:Size(max = 1000) val note: String? = null
)

data class ClientResponse(
    val id: UUID,
    val name: String,
    val phone: String?,
    val flagsNote: String?,
    val note: String?,
    val createdAt: Instant
)
