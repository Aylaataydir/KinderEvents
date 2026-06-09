// models/Forum.js
const mongoose = require('mongoose');

// ─── Alt Şemalar ────────────────────────────────────────────────

const replySchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Cevap zorunludur'],
      trim: true,
      maxlength: [500, 'Cevap 500 karakterden fazla olamaz'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { _id: true, timestamps: true }
);

// ─────────────────────────────────────────────────────────────────

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Yorum zorunludur'],
      trim: true,
      maxlength: [1000, 'Yorum 1000 karakterden fazla olamaz'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    replies: [replySchema],
  },
  { _id: true, timestamps: true }
);

// ─── Ana Forum Şeması ────────────────────────────────────────────

const forumSchema = new mongoose.Schema(
  {
    // ── Temel Bilgiler ────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Başlık zorunludur'],
      trim: true,
      maxlength: [150, 'Başlık 150 karakterden fazla olamaz'],
    },
    content: {
      type: String,
      required: [true, 'İçerik zorunludur'],
      trim: true,
      maxlength: [2000, 'İçerik 2000 karakterden fazla olamaz'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // ── Kategori ─────────────────────────────────────────────────
    category: {
      type: String,
      required: [true, 'Kategori zorunludur'],
      enum: [
        'art',
        'sports',
        'science',
        'music',
        'nature',
        'technology',
        'cooking',
        'reading',
        'general',
      ],
    },

    // ── Oluşturan ─────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Durum ─────────────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false, // admin öne çıkarabilir
    },
    isLocked: {
      type: Boolean,
      default: false, // admin kilitleyebilir → yeni yorum yapılamaz
    },

    // ── Beğeni ───────────────────────────────────────────────────
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ── Yorumlar ─────────────────────────────────────────────────
    comments: [commentSchema],

    // ── İstatistikler ─────────────────────────────────────────────
    stats: {
      viewCount: { type: Number, default: 0 },
      commentCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexler ────────────────────────────────────────────────────

forumSchema.index({ slug: 1 });
forumSchema.index({ category: 1 });
forumSchema.index({ createdBy: 1 });
forumSchema.index({ isPinned: -1, createdAt: -1 }); // önce pinliler, sonra yeniler
forumSchema.index({ isDeleted: 1 });

// ─── Virtuals ────────────────────────────────────────────────────

// Toplam beğeni sayısı
forumSchema.virtual('likeCount').get(function () {
  return this.likes.length;
});

// ─── Middleware ───────────────────────────────────────────────────

// Slug otomatik üret
forumSchema.pre('save', function (next) {
  if (!this.isModified('title')) return next();
  this.slug =
    this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() +
    '-' +
    Date.now();
  next();
});

// Yorum eklenince commentCount güncelle
forumSchema.pre('save', function (next) {
  this.stats.commentCount = this.comments.filter(
    (c) => !c.isDeleted
  ).length;
  next();
});

// ─── Methods ──────────────────────────────────────────────────────

// Yorum ekle
forumSchema.methods.addComment = function (userId, content) {
  if (this.isLocked) throw new Error('Bu konu kilitli, yorum yapılamaz');
  this.comments.push({ content, createdBy: userId });
  return this.save();
};

// Yoruma cevap ekle
forumSchema.methods.addReply = function (userId, commentId, content) {
  if (this.isLocked) throw new Error('Bu konu kilitli, cevap verilemez');
  const comment = this.comments.id(commentId);
  if (!comment || comment.isDeleted) throw new Error('Yorum bulunamadı');
  comment.replies.push({ content, createdBy: userId });
  return this.save();
};

// Forumu beğen / beğeniyi geri al
forumSchema.methods.toggleLike = function (userId) {
  const index = this.likes.indexOf(userId);
  if (index === -1) {
    this.likes.push(userId);
  } else {
    this.likes.splice(index, 1);
  }
  return this.save();
};

// Yorumu beğen / beğeniyi geri al
forumSchema.methods.toggleCommentLike = function (userId, commentId) {
  const comment = this.comments.id(commentId);
  if (!comment || comment.isDeleted) throw new Error('Yorum bulunamadı');
  const index = comment.likes.indexOf(userId);
  if (index === -1) {
    comment.likes.push(userId);
  } else {
    comment.likes.splice(index, 1);
  }
  return this.save();
};

// Cevabı beğen / beğeniyi geri al
forumSchema.methods.toggleReplyLike = function (userId, commentId, replyId) {
  const comment = this.comments.id(commentId);
  if (!comment || comment.isDeleted) throw new Error('Yorum bulunamadı');
  const reply = comment.replies.id(replyId);
  if (!reply || reply.isDeleted) throw new Error('Cevap bulunamadı');
  const index = reply.likes.indexOf(userId);
  if (index === -1) {
    reply.likes.push(userId);
  } else {
    reply.likes.splice(index, 1);
  }
  return this.save();
};

// Yorum sil (soft delete)
forumSchema.methods.deleteComment = function (userId, commentId, isAdmin) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Yorum bulunamadı');
  if (!isAdmin && comment.createdBy.toString() !== userId.toString()) {
    throw new Error('Bu yorumu silme yetkiniz yok');
  }
  comment.isDeleted = true;
  comment.content = 'Bu yorum silindi';
  return this.save();
};

// Cevap sil (soft delete)
forumSchema.methods.deleteReply = function (userId, commentId, replyId, isAdmin) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Yorum bulunamadı');
  const reply = comment.replies.id(replyId);
  if (!reply) throw new Error('Cevap bulunamadı');
  if (!isAdmin && reply.createdBy.toString() !== userId.toString()) {
    throw new Error('Bu cevabı silme yetkiniz yok');
  }
  reply.isDeleted = true;
  reply.content = 'Bu cevap silindi';
  return this.save();
};

// ─────────────────────────────────────────────────────────────────

const Forum = mongoose.model('Forum', forumSchema);
module.exports = Forum;