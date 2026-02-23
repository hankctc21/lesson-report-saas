package com.lessonreport.saas.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.MapsId
import jakarta.persistence.OneToOne
import jakarta.persistence.Table
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "client_profiles")
open class ClientProfile(
    @Id
    @Column(name = "client_id", nullable = false)
    open var clientId: UUID? = null,

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "client_id", nullable = false)
    open var client: Client? = null,

    @Column(name = "pain_note", length = 1000)
    open var painNote: String? = null,

    @Column(name = "goal_note", length = 1000)
    open var goalNote: String? = null,

    @Column(name = "surgery_history", length = 1000)
    open var surgeryHistory: String? = null,

    @Column(name = "before_class_memo", length = 1000)
    open var beforeClassMemo: String? = null,

    @Column(name = "after_class_memo", length = 1000)
    open var afterClassMemo: String? = null,

    @Column(name = "next_lesson_plan", length = 1000)
    open var nextLessonPlan: String? = null,

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    open var updatedAt: Instant? = null
)
