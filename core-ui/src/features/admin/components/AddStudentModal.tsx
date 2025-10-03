import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert
} from '@mui/material';
import { useAppDispatch } from '../../../store/hooks';
import { addUserToClassroom } from '../../../store/slice/classroomsSlice';
import { User } from '../../../store/slice/usersSlice';
import AddStudentSearch from './AddStudentSearch';

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  classroomId: number;
  classroomName: string;
  existingMemberIds: number[];
  onStudentAdded: (user: User) => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({
  open,
  onClose,
  classroomId,
  classroomName,
  existingMemberIds,
  onStudentAdded
}) => {
  const dispatch = useAppDispatch();
  const [addingUserId, setAddingUserId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddUser = async (user: User) => {
    setAddingUserId(user.id);
    setErrorMessage(null);
    
    try {
      await dispatch(addUserToClassroom({ 
        classroomId, 
        userId: user.id 
      })).unwrap();
      
      // Show success message
      setSuccessMessage(`${user.first_name} ${user.last_name} has been added to ${classroomName}!`);
      
      // Notify parent component
      onStudentAdded(user);
      
      // Clear success message and close modal after a brief delay
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
      
    } catch (error) {
      // Handle specific error cases
      if (typeof error === 'string') {
        if (error.includes('already a member')) {
          setErrorMessage(`${user.first_name} ${user.last_name} is already a member of this classroom.`);
        } else if (error.includes('Join period has expired')) {
          setErrorMessage('Unable to add student - this should not happen for instructor/admin actions.');
        } else if (error.includes('already ended')) {
          setErrorMessage('Cannot add students to a classroom that has already ended.');
        } else {
          setErrorMessage(`Failed to add ${user.first_name} ${user.last_name}: ${error}`);
        }
      } else {
        setErrorMessage(`Failed to add ${user.first_name} ${user.last_name}. Please try again.`);
      }
    } finally {
      setAddingUserId(null);
    }
  };

  const handleClose = () => {
    // Clear any messages when closing
    setSuccessMessage(null);
    setErrorMessage(null);
    setAddingUserId(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Add Student to {classroomName}
      </DialogTitle>
      
      <DialogContent>
        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Make sure the student has logged in first to have an account automatically created, 
            then search and add them to the class.
          </Typography>
        </Alert>
        
        {/* Success Message */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        
        {/* Error Message */}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        
        {/* Search Component */}
        <AddStudentSearch
          placeholder="Search for students by name..."
          existingUserIds={existingMemberIds}
          onUserAdd={handleAddUser}
          addingUserId={addingUserId || undefined}
        />
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleClose}
          disabled={addingUserId !== null}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddStudentModal;