// models/Event.js


const mongoose = require('mongoose');

// ─── Alt Şemalar ────────────────────────────────────────────────

const priceSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            default: 0,
            min: [0, 'Fiyat 0dan küçük olamaz'],
        },
        currency: {
            type: String,
            default: 'EUR',
        },
        // serviceFee: {   // Hizmet bedeli. organizatörün belirlediği fiyatın üzerine platformun aldığı ek ücret.
        //     type: Number,
        //     default: 0,
        // },
    },
    { _id: false }
);

// ─────────────────────────────────────────────────────────────────

const locationSchema = new mongoose.Schema(
    {
        venueName: {  //mekan adi
            type: String,
            trim: true,
            default: null, // etkinlik yeri adı → "Greenpoint Creative Hub"
        },
        address: {
            type: String,
            trim: true,
            required: [true, 'Adres zorunludur'],
        },
        district: {   //ilce
            type: String,
            trim: true,
            default: null,
        },
        city: {
            type: String,
            trim: true,
            required: [true, 'Şehir zorunludur'],
        },
        state: {
            type: String,
            trim: true,
            default: null,
        },
        zipCode: {
            type: String,
            trim: true,
            match: [/^\d{5}$/, 'Geçerli bir Alman posta kodu giriniz'],
            default: null,
        },
        country: {
            type: String,
            default: 'DE',
        },
        // coordinates: {
        //   type: {
        //     type: String,
        //     enum: ['Point'],
        //     default: 'Point',
        //   },
        //   coordinates: {
        //     type: [Number], // [longitude, latitude]
        //     default: undefined,
        //   },
        // },
        isOnline: {
            type: Boolean,
            default: false,
        },
        onlineLink: {
            type: String,
            default: null,
        },
    },
    { _id: false }
);

// ─────────────────────────────────────────────────────────────────

const scheduleSchema = new mongoose.Schema(
    {
        startDate: {
            type: Date,
            required: [true, 'Başlangıç tarihi zorunludur'],
        },
        endDate: {
            type: Date,
            required: [true, 'Bitiş tarihi zorunludur'],
        },
        isRecurring: { // tekrarlayan etkinlikler icin
            type: Boolean,
            default: false,
        },
        recurrenceRule: {
            type: String,
            enum: ['daily', 'weekly', 'biweekly', 'monthly'],
            default: null, // isRecurring false ise null
        },
        recurrenceEndDate: {
            type: Date,
            default: null, // tekrarlama ne zaman bitecek
        },
    },
    { _id: false }
);

// ─────────────────────────────────────────────────────────────────

const capacitySchema = new mongoose.Schema(
    {
        total: {
            type: Number,
            required: [true, 'Kapasite zorunludur'],
            min: [1, 'Kapasite en az 1 olmalıdır'],
        },
        registered: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

// ─── Ana Event Şeması ────────────────────────────────────────────

const eventSchema = new mongoose.Schema(
    {
        // ── Temel Bilgiler ────────────────────────────────────────────
        title: {
            type: String,
            required: [true, 'Etkinlik adı zorunludur'],
            trim: true,
            maxlength: [100, 'Etkinlik adı 100 karakterden fazla olamaz'],
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
            // "junior-soccer-masterclass-2024" gibi URL dostu isim
            // kayıt sırasında otomatik üretilecek
        },
        description: {
            type: String,
            required: [true, 'Açıklama zorunludur'],
            maxlength: [2000, 'Açıklama 2000 karakterden fazla olamaz'],
        },
        coverImage: {
            type: String,
            default: null,
        },
        images: [
            {
                type: String, // ek görseller
            },
        ],

        // ── Kategori & Etiketler ──────────────────────────────────────
        category: {
            type: String,
            required: [true, 'Kategori zorunludur'],
            enum: [
                'sports',
                'art',
                'science',
                'music',
                'nature',
                'technology',
                'cooking',
                'reading',
                'other',
            ],
        },
        // tags: [
        //     {
        //         type: String,
        //         enum: [
        //             'certified_safe',   // Zertifizierter Sicherheitsraum
        //             'barrier_free',     // Barrierefrei
        //             'inclusive',        // Inklusiv
        //             'outdoor',
        //             'indoor',
        //             'free_cancellation',
        //             'beginner_friendly',
        //         ],
        //     },
        // ],

        // ── Yaş Aralığı ───────────────────────────────────────────────
        ageRange: {
            min: {
                type: Number,
                required: [true, 'Minimum yaş zorunludur'],
                min: [0, 'Minimum yaş 0dan küçük olamaz'],
            },
            max: {
                type: Number,
                required: [true, 'Maximum yaş zorunludur'],
                max: [14, 'Maximum yaş 14ten büyük olamaz'],
            },
        },

        // ── Oluşturan ─────────────────────────────────────────────────
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        creatorRole: {
            type: String,
            enum: ['parent', 'organizer', 'admin'],
            required: true,
            // organizatör mü ebeveyn mi oluşturdu frontend bunu okuyacak
        },
        organizerName: {
            type: String,
            trim: true,
            default: null,
            // organizatörse kurum adı, ebeveynse null
        },

        // ── Durum & Onay ──────────────────────────────────────────────
        status: {
            type: String,
            enum: [
                'pending',    // ebeveyn oluşturdu, admin onayı bekliyor
                'approved',   // yayında
                'rejected',   // admin reddetti
                'cancelled',  // iptal edildi
                'completed',  // tamamlandı
            ],
            default: 'pending',
        },
        rejectedReason: {
            type: String,
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },

        // ── Ücret ─────────────────────────────────────────────────────
        isFree: {
            type: Boolean,
            default: true,
        },
        price: {
            type: priceSchema,
            default: undefined,
            // isFree true ise bu alan boş kalır
        },

        // ── Zamanlama ─────────────────────────────────────────────────
        schedule: {
            type: scheduleSchema,
            required: true,
        },

        // ── Konum ────────────────────────────────────────────────────
        location: {
            type: locationSchema,
            required: true,
        },

        // ── Kapasite ─────────────────────────────────────────────────
        capacity: {
            type: capacitySchema,
            required: true,
        },

        // ── Kayıtlı Kullanıcılar ──────────────────────────────────────
        registrations: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                childId: {
                    type: mongoose.Schema.Types.ObjectId,
                },
                registeredAt: {
                    type: Date,
                    default: Date.now,
                },
                status: {
                    type: String,
                    enum: ['confirmed', 'cancelled'],
                    default: 'confirmed',
                },
                paymentStatus: {  //odeme adiminda kullanilicak. 1. Kullanıcı "Kayıt Ol" butonuna tıklar
                    // 2. Ödeme sayfasına yönlendirilir(Stripe vs.)
                    // 3. Ödeme başlar    → paymentStatus: 'pending'
                    // 4. Ödeme onaylanır → paymentStatus: 'paid' + status: 'confirmed'
                    // 5. Ödeme başarısız → kayıt silinir veya iptal edilir
                    // 6. İptal edilirse  → paymentStatus: 'refunded'
                    // type: String,
                    enum: ['free', 'pending', 'paid', 'refunded'],
                    default: 'free',
                },
            },
        ],

        // ── İstatistikler ─────────────────────────────────────────────
        stats: {
            viewCount: { type: Number, default: 0 },
            saveCount: { type: Number, default: 0 },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexler ────────────────────────────────────────────────────

eventSchema.index({ slug: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ creatorRole: 1 });
eventSchema.index({ 'location.city': 1 });
eventSchema.index({ 'location.zipCode': 1 });
eventSchema.index({ 'ageRange.min': 1, 'ageRange.max': 1 });
eventSchema.index({ 'schedule.startDate': 1 });
eventSchema.index({ 'location.coordinates': '2dsphere' }); // konum bazlı arama

// ─── Virtuals ────────────────────────────────────────────────────

// Kapasite doldu mu?
eventSchema.virtual('isFull').get(function () {
    return this.capacity.registered >= this.capacity.total;
});

// Kaç yer kaldı?
eventSchema.virtual('spotsLeft').get(function () {
    const left = this.capacity.total - this.capacity.registered;
    return left < 0 ? 0 : left;
});

// Event geçti mi?
eventSchema.virtual('isExpired').get(function () {
    return this.schedule.endDate < new Date();
});

// ─── Middleware ───────────────────────────────────────────────────

// Slug otomatik üret
eventSchema.pre('save', function (next) {
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

// Organizatör eventi direkt approved, ebeveyn eventi pending
eventSchema.pre('save', function (next) {
    if (this.isNew) {
        if (this.creatorRole === 'organizer' || this.creatorRole === 'admin') {
            this.status = 'approved';
        } else {
            this.status = 'pending';
        }
    }
    next();
});

// Ücretli event sadece organizatör oluşturabilir
eventSchema.pre('save', function (next) {
    if (!this.isFree && this.creatorRole === 'parent') {
        return next(new Error('Ebeveynler sadece ücretsiz etkinlik oluşturabilir'));
    }
    next();
});

// ─── Methods ──────────────────────────────────────────────────────

// Kayıt ol
eventSchema.methods.registerUser = function (userId, childId) {
    if (this.isFull) {
        // kapasite doluysa waitlist'e ekle
        this.registrations.push({
            user: userId,
            childId,
            status: 'waitlist',
            paymentStatus: this.isFree ? 'free' : 'pending',
        });
        this.capacity.waitlist += 1;
    } else {
        this.registrations.push({
            user: userId,
            childId,
            status: 'confirmed',
            paymentStatus: this.isFree ? 'free' : 'pending',
        });
        this.capacity.registered += 1;
    }
    return this.save();
};

// Kayıt iptal et
eventSchema.methods.cancelRegistration = function (userId) {
    const registration = this.registrations.find(
        (r) => r.user.toString() === userId.toString() && r.status !== 'cancelled'
    );

    if (!registration) throw new Error('Kayıt bulunamadı');

    registration.status = 'cancelled';

    if (registration.status === 'confirmed') {
        this.capacity.registered -= 1;

        // Waitlistten birini confirmed yap
        const nextInLine = this.registrations.find((r) => r.status === 'waitlist');
        if (nextInLine) {
            nextInLine.status = 'confirmed';
            this.capacity.registered += 1;
            this.capacity.waitlist -= 1;
        }
    }

    return this.save();
};

// ─────────────────────────────────────────────────────────────────

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;