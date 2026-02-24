package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.GroupSequenceLog
import com.lessonreport.saas.domain.SessionType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.EntityGraph
import java.util.UUID

interface GroupSequenceLogRepository : JpaRepository<GroupSequenceLog, UUID> {
    @EntityGraph(attributePaths = ["session", "center"])
    fun findByCenterIdAndInstructorIdOrderByClassDateDescCreatedAtDesc(centerId: UUID, instructorId: UUID): List<GroupSequenceLog>
    @EntityGraph(attributePaths = ["session", "center"])
    fun findByCenterIdAndInstructorIdAndLessonTypeOrderByClassDateDescCreatedAtDesc(centerId: UUID, instructorId: UUID, lessonType: SessionType): List<GroupSequenceLog>
}
