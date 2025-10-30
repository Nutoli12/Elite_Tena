import pool from '../config/database.js';

export class Appointment {
  // Create appointment record
  static async create(blockchainAppointmentId, patientWallet, doctorWallet, appointmentDate, feeEth, notes = null) {
    const result = await pool.query(
      `INSERT INTO appointments 
       (blockchain_appointment_id, patient_wallet, doctor_wallet, appointment_date, fee_eth, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [blockchainAppointmentId, patientWallet, doctorWallet, appointmentDate, feeEth, notes]
    );
    return result.rows[0];
  }

  // Get appointments by patient
  static async findByPatient(patientWallet) {
    const result = await pool.query(
      `SELECT a.*, u.specialization as doctor_specialization
       FROM appointments a
       JOIN users u ON a.doctor_wallet = u.wallet_address
       WHERE a.patient_wallet = $1 
       ORDER BY a.appointment_date DESC`,
      [patientWallet]
    );
    return result.rows;
  }

  // Get appointments by doctor
  static async findByDoctor(doctorWallet) {
    const result = await pool.query(
      `SELECT a.*, u.email as patient_email, u.phone as patient_phone
       FROM appointments a
       JOIN users u ON a.patient_wallet = u.wallet_address
       WHERE a.doctor_wallet = $1 
       ORDER BY a.appointment_date DESC`,
      [doctorWallet]
    );
    return result.rows;
  }

  // Update appointment status
  static async updateStatus(appointmentId, status) {
    const result = await pool.query(
      `UPDATE appointments 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, appointmentId]
    );
    return result.rows[0];
  }

  // Get upcoming appointments
  static async getUpcoming(limit = 10) {
    const result = await pool.query(
      `SELECT a.*, 
              p.wallet_address as patient_wallet,
              d.wallet_address as doctor_wallet,
              d.specialization as doctor_specialization
       FROM appointments a
       JOIN users p ON a.patient_wallet = p.wallet_address
       JOIN users d ON a.doctor_wallet = d.wallet_address
       WHERE a.appointment_date >= CURRENT_TIMESTAMP 
       AND a.status = 'scheduled'
       ORDER BY a.appointment_date ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}
