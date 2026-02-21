package com.lessonreport.saas.service

import com.lessonreport.saas.domain.Instructor
import com.lessonreport.saas.repository.InstructorRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@Component
class InstructorContext(
    private val instructorRepository: InstructorRepository,
    @Value("\${app.default-instructor-id:11111111-1111-1111-1111-111111111111}")
    private val defaultInstructorId: UUID
) {
    fun currentInstructor(): Instructor =
        instructorRepository.findById(defaultInstructorId).orElseThrow {
            ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Default instructor not found. Check migration seed data."
            )
        }

    fun currentInstructorId(): UUID = currentInstructor().id!!
}
