import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Box
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import axios from 'axios';

interface RemoveStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  studentName: string;
  studentEmail: string;
  classroomId: number;
  studentId: number;
  classroomName: string;
}

const RemoveStudentDialog: React.FC<RemoveStudentDialogProps> = ({
  open,
  onClose,
  onConfirm,
  studentName,
  studentEmail,
  classroomId,
  studentId,
  classroomName
}) => {
  const [annotationCount, setAnnotationCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch annotation count when dialog opens
  useEffect(() => {
    if (open) {
      fetchAnnotationCount();
    } else {
      // Reset state when dialog closes
      setAnnotationCount(null);
      setError(null);
    }
  }, [open, classroomId, studentId]);

  const fetchAnnotationCount = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all annotations for this classroom
      const response = await axios.get(`/api/v1/annotations/?classroom_id=${classroomId}&limit=1000`);
      
      // Count annotations created by this student
      const studentAnnotations = response.data.filter(
        (annotation: any) => annotation.creator?.id === studentId
      );
      
      setAnnotationCount(studentAnnotations.length);
    } catch (err) {
      console.error('Failed to fetch annotation count:', err);
      setError('Unable to fetch annotation count');
      setAnnotationCount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ color: 'warning.main' }} />
          <span>Remove Student from Classroom</span>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Are you sure you want to remove <strong>{studentName}</strong> ({studentEmail}) from <strong>{classroomName}</strong>?
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Checking student's contributions...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : annotationCount !== null && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This student has <strong>{annotationCount}</strong> annotation{annotationCount !== 1 ? 's' : ''} 
            {annotationCount > 0 ? ' (including comments and replies)' : ''} in this classroom.
          </Alert>
        )}

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            What will happen:
          </Typography>
          <Typography variant="body2" component="div">
            • Student will be removed from the classroom roster<br />
            • Their annotations and replies will be hidden from all classroom members<br />
            • Student will lose access to classroom materials<br />
          </Typography>
        </Alert>

        <Alert severity="info">
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Important notes:
          </Typography>
          <Typography variant="body2" component="div">
            • All data is preserved in the system<br />
            • If the student re-joins, their annotations will reappear<br />
            • Annotations in other classrooms are not affected<br />
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={loading}
        >
          Remove Student
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RemoveStudentDialog;
