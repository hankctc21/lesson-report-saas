package com.lessonreport.saas.repository

import com.lessonreport.saas.domain.ReportShare
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ReportShareRepository : JpaRepository<ReportShare, UUID> {
    fun findTopByReportIdAndRevokedFalseOrderByCreatedAtDesc(reportId: UUID): ReportShare?
    fun findByToken(token: String): ReportShare?
}
