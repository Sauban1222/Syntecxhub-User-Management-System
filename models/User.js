import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters long'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
      validate: {
        validator: (password) =>
          !password || Buffer.byteLength(password, 'utf8') <= 72,
        message: 'Password cannot exceed 72 bytes',
      },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

function omitPassword(_document, serialized) {
  delete serialized.password;
  return serialized;
}

userSchema.set('toJSON', { transform: omitPassword });
userSchema.set('toObject', { transform: omitPassword });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
