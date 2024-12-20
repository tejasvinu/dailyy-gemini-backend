import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  }
}, { timestamps: true })

export default mongoose.models.Note || mongoose.model('Note', noteSchema)

