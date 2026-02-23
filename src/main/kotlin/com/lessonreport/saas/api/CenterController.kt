package com.lessonreport.saas.api

import com.lessonreport.saas.domain.Center
import com.lessonreport.saas.repository.CenterRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/centers")
class CenterController(
    private val centerRepository: CenterRepository,
    private val instructorContext: InstructorContext
) {
    @GetMapping
    fun list(): List<CenterResponse> {
        val instructorId = instructorContext.currentInstructorId()
        return centerRepository.findByInstructorIdOrderByCreatedAtDesc(instructorId).map { it.toResponse() }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: CenterCreateRequest): CenterResponse {
        val center = Center(
            instructor = instructorContext.currentInstructor(),
            name = request.name.trim(),
            isActive = true
        )
        return centerRepository.save(center).toResponse()
    }

    private fun Center.toResponse() = CenterResponse(
        id = id!!,
        name = name!!,
        isActive = isActive,
        createdAt = createdAt ?: Instant.now()
    )
}

data class CenterCreateRequest(
    @field:NotBlank @field:Size(max = 120) val name: String
)

data class CenterResponse(
    val id: UUID,
    val name: String,
    val isActive: Boolean,
    val createdAt: Instant
)
