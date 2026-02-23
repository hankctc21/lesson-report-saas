package com.lessonreport.saas.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "report_photos")
open class ReportPhoto(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    open var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    open var report: Report? = null,

    @Column(name = "file_name", nullable = false, length = 255)
    open var fileName: String? = null,

    @Column(name = "content_type", nullable = false, length = 120)
    open var contentType: String? = null,

    @Column(name = "storage_path", nullable = false, length = 1000)
    open var storagePath: String? = null,

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: Instant? = null
)
