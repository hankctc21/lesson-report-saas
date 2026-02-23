package com.lessonreport.saas.api

import com.lessonreport.saas.domain.GroupSequenceLog
import com.lessonreport.saas.repository.CenterRepository
import com.lessonreport.saas.repository.GroupSequenceLogRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
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
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/api/v1/group-sequences")
class GroupSequenceController(
    private val groupSequenceLogRepository: GroupSequenceLogRepository,
    private val centerRepository: CenterRepository,
    private val instructorContext: InstructorContext
) {
    @GetMapping
    fun list(@RequestParam centerId: UUID): List<GroupSequenceResponse> {
        val instructorId = instructorContext.currentInstructorId()
        ensureOwnedCenter(centerId, instructorId)
        return groupSequenceLogRepository.findByCenterIdAndInstructorIdOrderByClassDateDescCreatedAtDesc(centerId, instructorId)
            .map { it.toResponse() }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: GroupSequenceCreateRequest): GroupSequenceResponse {
        val instructor = instructorContext.currentInstructor()
        val center = ensureOwnedCenter(request.centerId, instructor.id!!)
        val row = GroupSequenceLog(
            instructor = instructor,
            center = center,
            classDate = request.classDate,
            equipmentBrand = request.equipmentBrand,
            springSetting = request.springSetting,
            todaySequence = request.todaySequence,
            nextSequence = request.nextSequence,
            beforeMemo = request.beforeMemo,
            afterMemo = request.afterMemo,
            memberNotes = request.memberNotes
        )
        return groupSequenceLogRepository.save(row).toResponse()
    }

    private fun ensureOwnedCenter(centerId: UUID, instructorId: UUID) =
        centerRepository.findByIdAndInstructorId(centerId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Center not found")

    private fun GroupSequenceLog.toResponse() = GroupSequenceResponse(
        id = id!!,
        centerId = center!!.id!!,
        classDate = classDate!!,
        equipmentBrand = equipmentBrand,
        springSetting = springSetting,
        todaySequence = todaySequence,
        nextSequence = nextSequence,
        beforeMemo = beforeMemo,
        afterMemo = afterMemo,
        memberNotes = memberNotes,
        createdAt = createdAt ?: Instant.now()
    )
}

data class GroupSequenceCreateRequest(
    @field:NotNull val centerId: UUID,
    @field:NotNull val classDate: LocalDate,
    @field:Size(max = 120) val equipmentBrand: String? = null,
    @field:Size(max = 500) val springSetting: String? = null,
    @field:Size(max = 2000) val todaySequence: String? = null,
    @field:Size(max = 2000) val nextSequence: String? = null,
    @field:Size(max = 1000) val beforeMemo: String? = null,
    @field:Size(max = 1000) val afterMemo: String? = null,
    @field:Size(max = 2000) val memberNotes: String? = null
)

data class GroupSequenceResponse(
    val id: UUID,
    val centerId: UUID,
    val classDate: LocalDate,
    val equipmentBrand: String?,
    val springSetting: String?,
    val todaySequence: String?,
    val nextSequence: String?,
    val beforeMemo: String?,
    val afterMemo: String?,
    val memberNotes: String?,
    val createdAt: Instant
)
