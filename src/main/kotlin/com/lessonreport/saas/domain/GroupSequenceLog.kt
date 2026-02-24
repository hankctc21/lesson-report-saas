package com.lessonreport.saas.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "group_sequence_logs")
open class GroupSequenceLog(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    open var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instructor_id", nullable = false)
    open var instructor: Instructor? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "center_id", nullable = false)
    open var center: Center? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    open var session: LessonSession? = null,

    @Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(name = "lesson_type", nullable = false, length = 20)
    open var lessonType: SessionType = SessionType.GROUP,

    @Column(name = "class_date", nullable = false)
    open var classDate: LocalDate? = null,

    @Column(name = "equipment_type", length = 40)
    open var equipmentType: String? = null,

    @Column(name = "equipment_brand", length = 120)
    open var equipmentBrand: String? = null,

    @Column(name = "spring_setting", length = 500)
    open var springSetting: String? = null,

    @Column(name = "today_sequence", length = 2000)
    open var todaySequence: String? = null,

    @Column(name = "next_sequence", length = 2000)
    open var nextSequence: String? = null,

    @Column(name = "before_memo", length = 1000)
    open var beforeMemo: String? = null,

    @Column(name = "after_memo", length = 1000)
    open var afterMemo: String? = null,

    @Column(name = "member_notes", length = 2000)
    open var memberNotes: String? = null,

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: Instant? = null
)
