package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.ReportPhoto
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ReportPhotoRepository : JpaRepository<ReportPhoto, UUID> {
    fun findByReportIdOrderByCreatedAtDesc(reportId: UUID): List<ReportPhoto>
    fun findByIdAndReportId(photoId: UUID, reportId: UUID): ReportPhoto?
}
