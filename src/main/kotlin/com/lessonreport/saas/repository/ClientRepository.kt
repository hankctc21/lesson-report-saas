package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.Client
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ClientRepository : JpaRepository<Client, UUID> {
    fun findByInstructorIdOrderByCreatedAtDesc(instructorId: UUID): List<Client>
    fun findByIdAndInstructorId(id: UUID, instructorId: UUID): Client?
}
