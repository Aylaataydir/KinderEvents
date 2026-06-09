
// models/Forum.js
const mongoose = require('mongoose');

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
        isPinned: {    // sabitleme.    
            type: Boolean,
            default: false,
        },
        isLocked: {    // yorum yapmaya devam edilemiycek. ama diger yorumlar durucak.
            type: Boolean,
            default: false,
        },

        // ── Beğeni ───────────────────────────────────────────────────
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],

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
forumSchema.index({ isPinned: -1, createdAt: -1 });
forumSchema.index({ isDeleted: 1 });

// ─── Virtuals ────────────────────────────────────────────────────

forumSchema.virtual('likeCount').get(function () {
    return this.likes.length;
});

// Comment modeline sanal referans → populate ile çekilebilir
forumSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'forumId',
    match: { isDeleted: false },
});

// ─── Middleware ───────────────────────────────────────────────────

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

// ─── Methods ──────────────────────────────────────────────────────

forumSchema.methods.toggleLike = function (userId) {
    const index = this.likes.indexOf(userId);
    if (index === -1) {
        this.likes.push(userId);
    } else {
        this.likes.splice(index, 1);
    }
    return this.save();
};

// ─────────────────────────────────────────────────────────────────

const Forum = mongoose.model('Forum', forumSchema);
module.exports = Forum;



// models/Comment.js
const mongoose = require('mongoose');

// ─── Reply Alt Şeması ────────────────────────────────────────────
// Reply bağımsız sorgulanmayacağı için alt şema olarak kalıyor

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

// ─── Ana Comment Şeması ──────────────────────────────────────────

const commentSchema = new mongoose.Schema(
    {
        // ── Temel Bilgiler ────────────────────────────────────────────
        content: {
            type: String,
            required: [true, 'Yorum zorunludur'],
            trim: true,
            maxlength: [1000, 'Yorum 1000 karakterden fazla olamaz'],
        },

        // ── İlişkiler ─────────────────────────────────────────────────
        forumId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Forum',
            required: true,
        },
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

        // ── Beğeni ───────────────────────────────────────────────────
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],

        // ── Cevaplar (alt şema) ───────────────────────────────────────
        replies: [replySchema],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexler ────────────────────────────────────────────────────

commentSchema.index({ forumId: 1, createdAt: 1 });
commentSchema.index({ createdBy: 1 });
commentSchema.index({ isDeleted: 1 });

// ─── Virtuals ────────────────────────────────────────────────────

commentSchema.virtual('likeCount').get(function () {
    return this.likes.length;
});

commentSchema.virtual('replyCount').get(function () {
    return this.replies.filter((r) => !r.isDeleted).length;
});

// ─── Middleware ───────────────────────────────────────────────────

// Yorum eklenince veya silinince Forum'un commentCount'unu güncelle
commentSchema.post('save', async function () {
    await mongoose.model('Forum').findByIdAndUpdate(this.forumId, {
        $set: {
            'stats.commentCount': await mongoose
                .model('Comment')
                .countDocuments({ forumId: this.forumId, isDeleted: false }),
        },
    });
});

// ─── Methods ──────────────────────────────────────────────────────

// Yorumu beğen / beğeniyi geri al
commentSchema.methods.toggleLike = function (userId) {
    const index = this.likes.indexOf(userId);
    if (index === -1) {
        this.likes.push(userId);
    } else {
        this.likes.splice(index, 1);
    }
    return this.save();
};

// Cevap ekle
commentSchema.methods.addReply = function (userId, content) {
    this.replies.push({ content, createdBy: userId });
    return this.save();
};

// Cevabı beğen / beğeniyi geri al
commentSchema.methods.toggleReplyLike = function (userId, replyId) {
    const reply = this.replies.id(replyId);
    if (!reply || reply.isDeleted) throw new Error('Cevap bulunamadı');
    const index = reply.likes.indexOf(userId);
    if (index === -1) {
        reply.likes.push(userId);
    } else {
        reply.likes.splice(index, 1);
    }
    return this.save();
};

// Yorumu sil (soft delete)
commentSchema.methods.softDelete = function (userId, isAdmin) {
    if (!isAdmin && this.createdBy.toString() !== userId.toString()) {
        throw new Error('Bu yorumu silme yetkiniz yok');
    }
    this.isDeleted = true;
    this.content = 'Bu yorum silindi';
    return this.save();
};

// Cevabı sil (soft delete)
commentSchema.methods.deleteReply = function (userId, replyId, isAdmin) {
    const reply = this.replies.id(replyId);
    if (!reply) throw new Error('Cevap bulunamadı');
    if (!isAdmin && reply.createdBy.toString() !== userId.toString()) {
        throw new Error('Bu cevabı silme yetkiniz yok');
    }
    reply.isDeleted = true;
    reply.content = 'Bu cevap silindi';
    return this.save();
};

// ─────────────────────────────────────────────────────────────────

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;