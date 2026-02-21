package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.Instructor
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface InstructorRepository : JpaRepository<Instructor, UUID>
