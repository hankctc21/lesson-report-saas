package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.HomeworkAssignment
import org.springframework.data.jpa.repository.JpaRepository
import java.time.Instant
import java.util.UUID

interface HomeworkAssignmentRepository : JpaRepository<HomeworkAssignment, UUID> {
    fun findByClientIdAndInstructorIdOrderByCreatedAtDesc(clientId: UUID, instructorId: UUID): List<HomeworkAssignment>
    fun findByInstructorIdAndRemindAtLessThanEqualAndNotifiedAtIsNullAndCompletedFalse(instructorId: UUID, now: Instant): List<HomeworkAssignment>
    fun findByRemindAtLessThanEqualAndNotifiedAtIsNullAndCompletedFalse(now: Instant): List<HomeworkAssignment>
}
