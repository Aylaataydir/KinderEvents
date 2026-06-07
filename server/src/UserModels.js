
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Alt Şemalar ────────────────────────────────────────────────

const childSchema = new mongoose.Schema(
  {
    birthYear: {
      type: Number,
      required: [true, 'Doğum yılı zorunludur'],
      min: [new Date().getFullYear() - 14, 'Çocuk en fazla 14 yaşında olabilir'],
      max: [new Date().getFullYear(), 'Geçerli bir doğum yılı giriniz'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    // interests: [
    //   {
    //     type: String,
    //     enum: ['art', 'sports', 'science', 'music', 'nature', 'technology', 'cooking', 'reading'],
    //   },
    // ],
  },
  { _id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Doğum yılından yaş grubunu otomatik hesaplar
childSchema.virtual('ageGroup').get(function () {
  const age = new Date().getFullYear() - this.birthYear;
  if (age <= 2) return '0-2';
  if (age <= 5) return '3-5';
  if (age <= 10) return '6-10';
  return '11-14';
});

// ─────────────────────────────────────────────────────────────────

const locationSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      trim: true,
      default: null, // Eyalet: Bayern, NRW vs.
    },
    city: {
      type: String,
      trim: true,
      required: [true, 'Şehir zorunludur'],
    },
    district: {
      type: String,
      trim: true,
      default: null, // İlçe
    },
    zipCode: {
      type: String,
      trim: true,
      match: [/^\d{5}$/, 'Geçerli bir Alman posta kodu giriniz (5 hane)'],
      default: null,
    },
    country: {
      type: String,
      default: 'DE',
    },
  },
  { _id: false }
);

// ─────────────────────────────────────────────────────────────────

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: function () {
        return this.parent().role === 'organizer';
      },
    },
    type: {
      type: String,
      enum: ['school', 'municipality', 'ngo', 'private', 'other'],
      default: 'other',
    },
    // taxNumber: {
    //   type: String,
    //   trim: true,
    //   default: null,
    // },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Geçerli bir URL giriniz'],
      default: null,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      maxlength: [500, 'Açıklama 500 karakterden fazla olamaz'],
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false, // Admin onayından sonra true olur
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// ─── Ana User Şeması ─────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Kimlik Bilgileri ──────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'Ad zorunludur'],
      trim: true,
      maxlength: [50, 'Ad 50 karakterden fazla olamaz'],
    },
    lastName: {
      type: String,
      required: [true, 'Soyad zorunludur'],
      trim: true,
      maxlength: [50, 'Soyad 50 karakterden fazla olamaz'],
    },
    email: {
      type: String,
      required: [true, 'E-posta zorunludur'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Geçerli bir e-posta giriniz'],
    },
    password: {
      type: String,
      required: [true, 'Şifre zorunludur'],
      minlength: [8, 'Şifre en az 8 karakter olmalıdır'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9\s\-().]{7,20}$/, 'Geçerli bir telefon numarası giriniz'],
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },

    // ── Rol & Durum ───────────────────────────────────────────────
    role: {
      type: String,
      enum: ['parent', 'organizer', 'admin'],
      default: 'parent',
    },
    hasChildren: {
      type: Boolean,
      default: false,  // kayıt sırasında çocuk eklendiyse true olur
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // isBanned: {
    //   type: Boolean,
    //   default: false,
    // },
    // bannedReason: {
    //   type: String,
    //   default: null,
    // },

    // ── Dil & Tercihler ───────────────────────────────────────────
    language: {
      type: String,
      enum: ['de', 'en'],
      default: 'de',
    },

    // ── Konum ────────────────────────────────────────────────────
    location: {
      type: locationSchema,
      required: [true, 'Konum bilgisi zorunludur'],
    },

    // ── Ebeveyne Özel Alanlar ─────────────────────────────────────
    children: {
      type: [childSchema],
      default: undefined,
      // validate: {
      //   validator: function (val) {
      //     // Ebeveyn rolündeyse en az 1 çocuk zorunlu
      //     if (this.role === 'parent') return val && val.length > 0;
      //     return true;
      //   },
      //   message: 'Ebeveyn hesabı için en az bir çocuk profili zorunludur',
      // },
    },
    // canCreateEvents: {
    //   type: Boolean,
    //   default: false, // Ebeveyn etkinlik oluşturmak isterse true yapılır
    // },
    activeChildId: {      // eger userin birden fazla cocugu varsa frontendde cocuk secebilecegi bir alan olucak ve burdan sectigi cocuga gore icerikler gelicek.
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // ── Organizatöre Özel Alanlar ─────────────────────────────────
    institution: {
      type: institutionSchema,
      default: undefined,
    },

    // ── Kayıtlı Etkinlikler (ebeveyne özel) ──────────────────────
    registeredEvents: [
      {
        event: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Event',
        },
        childId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
        // status: {
        //   type: String,
        //   enum: ['pending', 'confirmed', 'cancelled', 'attended'],
        //   default: 'pending',
        // },
      },
    ],

    // ── Favoriler ─────────────────────────────────────────────────
    savedEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
      },
    ],
    savedActivities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity',
      },
    ],

    // ── Bildirim Tercihleri ───────────────────────────────────────
    notifications: {
      email: {
        newEvents: { type: Boolean, default: true },
        eventReminders: { type: Boolean, default: true },
        forumReplies: { type: Boolean, default: true },
        newsletter: { type: Boolean, default: false },
      },
      push: {
        enabled: { type: Boolean, default: false },
        token: { type: String, default: null, select: false },
      },
    },

    // ── Güvenlik ──────────────────────────────────────────────────
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    refreshToken: { type: String, select: false },
    lastLoginAt: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexler ────────────────────────────────────────────────────

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'location.city': 1 });
userSchema.index({ 'location.zipCode': 1 });
userSchema.index({ 'institution.isVerified': 1, role: 1 });

// ─── Virtuals ────────────────────────────────────────────────────

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ─── Middleware ───────────────────────────────────────────────────

// Şifre hashleme
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Organizatör kaydedilirken institution zorunlu
userSchema.pre('save', function (next) {
  if (this.role === 'organizer' && !this.institution?.name) {
    return next(new Error('Organizatör hesabı için kurum adı zorunludur'));
  }
  next();
});

// ─── Methods ──────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 30 * 60 * 1000;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLoginAt: Date.now() },
    $unset: { lockUntil: 1 },
  });
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  return obj;
};

// ─────────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema);
module.exports = User;