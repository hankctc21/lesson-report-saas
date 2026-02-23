package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.ClientProgressPhoto
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ClientProgressPhotoRepository : JpaRepository<ClientProgressPhoto, UUID> {
    fun findByClientIdAndInstructorIdOrderByCreatedAtDesc(clientId: UUID, instructorId: UUID): List<ClientProgressPhoto>
    fun findTop12ByClientIdAndInstructorIdOrderByCreatedAtDesc(clientId: UUID, instructorId: UUID): List<ClientProgressPhoto>
    fun findByIdAndClientId(photoId: UUID, clientId: UUID): ClientProgressPhoto?
}
