package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.GroupSequenceTemplate
import com.lessonreport.saas.domain.SessionType
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface GroupSequenceTemplateRepository : JpaRepository<GroupSequenceTemplate, UUID> {
    fun findByCenterIdAndInstructorIdAndLessonTypeOrderByCreatedAtDesc(centerId: UUID, instructorId: UUID, lessonType: SessionType): List<GroupSequenceTemplate>
    fun findByIdAndInstructorId(id: UUID, instructorId: UUID): GroupSequenceTemplate?
}
