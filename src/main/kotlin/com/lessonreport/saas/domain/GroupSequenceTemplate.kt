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
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "group_sequence_templates")
open class GroupSequenceTemplate(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    open var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instructor_id", nullable = false)
    open var instructor: Instructor? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "center_id", nullable = false)
    open var center: Center? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "lesson_type", nullable = false, length = 20)
    open var lessonType: SessionType = SessionType.GROUP,

    @Column(nullable = false, length = 120)
    open var title: String? = null,

    @Column(name = "equipment_brand", length = 120)
    open var equipmentBrand: String? = null,

    @Column(name = "spring_setting", length = 500)
    open var springSetting: String? = null,

    @Column(name = "sequence_body", length = 3000)
    open var sequenceBody: String? = null,

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: Instant? = null,

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    open var updatedAt: Instant? = null
)
