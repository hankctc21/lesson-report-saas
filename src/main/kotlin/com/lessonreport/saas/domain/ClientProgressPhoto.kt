package com.lessonreport.saas.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "client_progress_photos")
open class ClientProgressPhoto(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    open var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instructor_id", nullable = false)
    open var instructor: Instructor? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    open var client: Client? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "phase", nullable = false, length = 20)
    open var phase: ProgressPhotoPhase = ProgressPhotoPhase.ETC,

    @Column(length = 500)
    open var note: String? = null,

    @Column(name = "taken_on")
    open var takenOn: LocalDate? = null,

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
