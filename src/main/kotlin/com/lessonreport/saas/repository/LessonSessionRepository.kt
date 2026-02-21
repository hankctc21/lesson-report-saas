package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.LessonSession
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate
import java.util.UUID

interface LessonSessionRepository : JpaRepository<LessonSession, UUID> {
    fun findByInstructorIdAndSessionDateOrderByCreatedAtDesc(instructorId: UUID, sessionDate: LocalDate): List<LessonSession>
    fun findByIdAndInstructorId(id: UUID, instructorId: UUID): LessonSession?
}
