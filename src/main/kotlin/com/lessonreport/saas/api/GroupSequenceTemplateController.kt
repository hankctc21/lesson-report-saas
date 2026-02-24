package com.lessonreport.saas.api

import com.lessonreport.saas.domain.GroupSequenceTemplate
import com.lessonreport.saas.domain.SessionType
import com.lessonreport.saas.repository.CenterRepository
import com.lessonreport.saas.repository.GroupSequenceTemplateRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/group-sequence-templates")
class GroupSequenceTemplateController(
    private val centerRepository: CenterRepository,
    private val groupSequenceTemplateRepository: GroupSequenceTemplateRepository,
    private val instructorContext: InstructorContext
) {
    @GetMapping
    fun list(@RequestParam centerId: UUID, @RequestParam lessonType: SessionType): List<GroupSequenceTemplateResponse> {
        val instructorId = instructorContext.currentInstructorId()
        ensureOwnedCenter(centerId, instructorId)
        return groupSequenceTemplateRepository
            .findByCenterIdAndInstructorIdAndLessonTypeOrderByCreatedAtDesc(centerId, instructorId, lessonType)
            .map { it.toResponse() }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: GroupSequenceTemplateCreateRequest): GroupSequenceTemplateResponse {
        val instructor = instructorContext.currentInstructor()
        val center = ensureOwnedCenter(request.centerId, instructor.id!!)
        val row = GroupSequenceTemplate(
            instructor = instructor,
            center = center,
            lessonType = request.lessonType,
            title = request.title.trim(),
            equipmentBrand = request.equipmentBrand,
            springSetting = request.springSetting,
            sequenceBody = request.sequenceBody
        )
        return groupSequenceTemplateRepository.save(row).toResponse()
    }

    private fun ensureOwnedCenter(centerId: UUID, instructorId: UUID) =
        centerRepository.findByIdAndInstructorId(centerId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Center not found")

    private fun GroupSequenceTemplate.toResponse() = GroupSequenceTemplateResponse(
        id = id!!,
        centerId = center!!.id!!,
        lessonType = lessonType.name,
        title = title!!,
        equipmentBrand = equipmentBrand,
        springSetting = springSetting,
        sequenceBody = sequenceBody,
        createdAt = createdAt ?: Instant.now()
    )
}

data class GroupSequenceTemplateCreateRequest(
    @field:NotNull val centerId: UUID,
    @field:NotNull val lessonType: SessionType,
    @field:NotBlank @field:Size(max = 120) val title: String,
    @field:Size(max = 120) val equipmentBrand: String? = null,
    @field:Size(max = 500) val springSetting: String? = null,
    @field:Size(max = 3000) val sequenceBody: String? = null
)

data class GroupSequenceTemplateResponse(
    val id: UUID,
    val centerId: UUID,
    val lessonType: String,
    val title: String,
    val equipmentBrand: String?,
    val springSetting: String?,
    val sequenceBody: String?,
    val createdAt: Instant
)
