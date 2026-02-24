package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.HomeworkAssignment
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.EntityGraph
import java.time.Instant
import java.util.UUID

interface HomeworkAssignmentRepository : JpaRepository<HomeworkAssignment, UUID> {
    fun findByClientIdAndInstructorIdOrderByCreatedAtDesc(clientId: UUID, instructorId: UUID): List<HomeworkAssignment>
    @EntityGraph(attributePaths = ["client"])
    fun findByInstructorIdAndRemindAtLessThanEqualAndNotifiedAtIsNullAndCompletedFalse(instructorId: UUID, now: Instant): List<HomeworkAssignment>
    @EntityGraph(attributePaths = ["client"])
    fun findByRemindAtLessThanEqualAndNotifiedAtIsNullAndCompletedFalse(now: Instant): List<HomeworkAssignment>
}
