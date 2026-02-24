package com.lessonreport.saas.api

import com.lessonreport.saas.domain.GroupSequenceLog
import com.lessonreport.saas.domain.SessionType
import com.lessonreport.saas.repository.CenterRepository
import com.lessonreport.saas.repository.GroupSequenceLogRepository
import com.lessonreport.saas.repository.LessonSessionRepository
import com.lessonreport.saas.service.InstructorContext
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
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
    private val lessonSessionRepository: LessonSessionRepository,
    private val instructorContext: InstructorContext
) {
    @GetMapping
    fun list(@RequestParam centerId: UUID, @RequestParam(required = false) lessonType: SessionType?): List<GroupSequenceResponse> {
        val instructorId = instructorContext.currentInstructorId()
        ensureOwnedCenter(centerId, instructorId)
        val rows = if (lessonType == null) {
            groupSequenceLogRepository.findByCenterIdAndInstructorIdOrderByClassDateDescCreatedAtDesc(centerId, instructorId)
        } else {
            groupSequenceLogRepository.findByCenterIdAndInstructorIdAndLessonTypeOrderByClassDateDescCreatedAtDesc(centerId, instructorId, lessonType)
        }
        return rows
            .map { it.toResponse() }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: GroupSequenceCreateRequest): GroupSequenceResponse {
        val instructor = instructorContext.currentInstructor()
        val center = ensureOwnedCenter(request.centerId, instructor.id!!)
        val session = request.sessionId?.let {
            lessonSessionRepository.findByIdAndInstructorId(it, instructor.id!!)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found")
        }
        val row = GroupSequenceLog(
            instructor = instructor,
            center = center,
            session = session,
            lessonType = session?.sessionType ?: request.lessonType,
            classDate = session?.sessionDate ?: request.classDate,
            equipmentType = request.equipmentType,
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

    @PatchMapping("/{sequenceId}")
    fun update(@PathVariable sequenceId: UUID, @Valid @RequestBody request: GroupSequenceUpdateRequest): GroupSequenceResponse {
        val instructorId = instructorContext.currentInstructorId()
        val row = groupSequenceLogRepository.findByIdAndInstructorId(sequenceId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Sequence not found")

        row.equipmentType = request.equipmentType ?: row.equipmentType
        row.equipmentBrand = request.equipmentBrand ?: row.equipmentBrand
        row.springSetting = request.springSetting ?: row.springSetting
        row.todaySequence = request.todaySequence ?: row.todaySequence
        row.nextSequence = request.nextSequence ?: row.nextSequence
        row.beforeMemo = request.beforeMemo ?: row.beforeMemo
        row.afterMemo = request.afterMemo ?: row.afterMemo
        row.memberNotes = request.memberNotes ?: row.memberNotes

        return groupSequenceLogRepository.save(row).toResponse()
    }

    private fun ensureOwnedCenter(centerId: UUID, instructorId: UUID) =
        centerRepository.findByIdAndInstructorId(centerId, instructorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Center not found")

    private fun GroupSequenceLog.toResponse() = GroupSequenceResponse(
        id = id!!,
        centerId = center!!.id!!,
        sessionId = session?.id,
        lessonType = lessonType.name,
        classDate = classDate!!,
        equipmentType = equipmentType,
        equipmentBrand = equipmentBrand,
        sessionStartTime = session?.sessionStartTime?.toString(),
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
    val sessionId: UUID? = null,
    @field:NotNull val lessonType: SessionType,
    @field:NotNull val classDate: LocalDate,
    @field:Size(max = 40) val equipmentType: String? = null,
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
    val sessionId: UUID?,
    val lessonType: String,
    val classDate: LocalDate,
    val equipmentType: String?,
    val equipmentBrand: String?,
    val sessionStartTime: String?,
    val springSetting: String?,
    val todaySequence: String?,
    val nextSequence: String?,
    val beforeMemo: String?,
    val afterMemo: String?,
    val memberNotes: String?,
    val createdAt: Instant
)

data class GroupSequenceUpdateRequest(
    @field:Size(max = 40) val equipmentType: String? = null,
    @field:Size(max = 120) val equipmentBrand: String? = null,
    @field:Size(max = 500) val springSetting: String? = null,
    @field:Size(max = 2000) val todaySequence: String? = null,
    @field:Size(max = 2000) val nextSequence: String? = null,
    @field:Size(max = 1000) val beforeMemo: String? = null,
    @field:Size(max = 1000) val afterMemo: String? = null,
    @field:Size(max = 2000) val memberNotes: String? = null
)
