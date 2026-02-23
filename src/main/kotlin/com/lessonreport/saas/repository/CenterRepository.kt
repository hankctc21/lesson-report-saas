package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.Center
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface CenterRepository : JpaRepository<Center, UUID> {
    fun findByInstructorIdOrderByCreatedAtDesc(instructorId: UUID): List<Center>
    fun findByIdAndInstructorId(id: UUID, instructorId: UUID): Center?
}
