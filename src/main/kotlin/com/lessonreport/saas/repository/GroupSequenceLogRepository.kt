package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.GroupSequenceLog
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface GroupSequenceLogRepository : JpaRepository<GroupSequenceLog, UUID> {
    fun findByCenterIdAndInstructorIdOrderByClassDateDescCreatedAtDesc(centerId: UUID, instructorId: UUID): List<GroupSequenceLog>
}
