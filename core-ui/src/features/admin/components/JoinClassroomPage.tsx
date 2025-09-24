import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Container
} from '@mui/material';
import { School, Person } from '@mui/icons-material';
import { useAuth } from '../../../hooks/useAuthContext';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchClassroomByIdPublic,
  addUserToClassroom,
  selectPublicFetchStatus
} from '../../../store/slice/classroomsSlice';

interface InstructorInfo {
  name: string;
  email: string;
}

const JoinClassroomPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  
  const classroomId = searchParams.get('classroom_id');
  const [instructorInfo, setInstructorInfo] = useState<InstructorInfo | null>(null);
  const [instructorLoading, setInstructorLoading] = useState(false);
  const [instructorError, setInstructorError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  const classroom = useAppSelector(state => {
    // For join page, only use currentClassroom which is set by fetchClassroomByIdPublic
    // Don't fall back to selectClassroomById to avoid showing stale data after API failures
    if (state.classrooms.currentClassroom && 
        state.classrooms.currentClassroom.id === parseInt(classroomId || '0')) {
      return state.classrooms.currentClassroom;
    }
    return null;
  });
  
  const classroomsStatus = useAppSelector(selectPublicFetchStatus);

  // Helper function to check if classroom is active
  const isClassroomActive = (classroom: any) => {
    if (!classroom?.start_date || !classroom?.end_date) return true; // If no dates, assume active
    const now = new Date();
    const startDate = new Date(classroom.start_date);
    const endDate = new Date(classroom.end_date);
    // Set end date to end of day to be inclusive
    endDate.setHours(23, 59, 59, 999);
    return now >= startDate && now <= endDate;
  };

  useEffect(() => {
    if (classroomId) {
      dispatch(fetchClassroomByIdPublic(parseInt(classroomId)));
    }
  }, [classroomId, dispatch]);

  useEffect(() => {
    const fetchInstructorInfo = async () => {
      if (!classroom?.id || !isAuthenticated) return;
      
      setInstructorLoading(true);
      setInstructorError(null);
      
      try {
        const response = await fetch(`/api/v1/groups/${classroom.id}/instructor`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch instructor information: ${response.status} ${response.statusText}`);
        }
        
        const data: InstructorInfo = await response.json();
        setInstructorInfo(data);
      } catch (error) {
        setInstructorError('Unable to load instructor information');
      } finally {
        setInstructorLoading(false);
      }
    };

    fetchInstructorInfo();
  }, [classroom?.id, isAuthenticated]);

  const handleJoinClassroom = async () => {
    if (!classroom?.id || !isAuthenticated || !user?.id) return;
    
    setJoinLoading(true);
    setJoinError(null);
    
    try {
      await dispatch(addUserToClassroom({ classroomId: classroom.id, userId: user.id })).unwrap();
      navigate('/classrooms');
    } catch (error) {
      // Handle specific error cases
      if (typeof error === 'string' && error.includes('already a member')) {
        setJoinError('You are already a member of this classroom!');
      } else if (typeof error === 'string' && error.includes('404')) {
        setJoinError('Classroom or user not found. Please try again.');
      } else {
        setJoinError('Failed to join classroom. Please try again.');
      }
    } finally {
      setJoinLoading(false);
    }
  };

  if (!classroomId) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">
          Invalid classroom link. The classroom ID is missing.
        </Alert>
      </Container>
    );
  }

  if (classroomsStatus === 'loading' && !classroom) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Loading classroom information...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (classroomsStatus === 'failed') {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">
          Classroom not found. The link may be invalid or the classroom may no longer exist.
        </Alert>
      </Container>
    );
  }

  if (!classroom && classroomsStatus === 'idle') {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">
          Classroom not found. The link may be invalid or the classroom may no longer exist.
        </Alert>
      </Container>
    );
  }

  if (!classroom) {
    return null;
  }

  // Check if classroom is expired
  if (!isClassroomActive(classroom)) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="warning">
          <Typography variant="h6" gutterBottom>
            Classroom No Longer Available
          </Typography>
          <Typography variant="body1">
            The classroom "{classroom.name}" was active from{' '}
            {classroom.start_date ? new Date(classroom.start_date).toLocaleDateString() : 'unknown'} to{' '}
            {classroom.end_date ? new Date(classroom.end_date).toLocaleDateString() : 'unknown'}, but is no longer accepting new members.
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <School color="primary" sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {classroom.name}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Join this classroom
              </Typography>
            </Box>
          </Box>

          {classroom.description && (
            <Typography variant="body1" paragraph sx={{ mb: 3 }}>
              {classroom.description}
            </Typography>
          )}

          {isAuthenticated && (
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>
                Instructor Information
              </Typography>
              {instructorLoading ? (
                <Box display="flex" alignItems="center">
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  <Typography variant="body2">Loading instructor info...</Typography>
                </Box>
              ) : instructorError ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {instructorError}
                </Alert>
              ) : instructorInfo ? (
                <Box>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Person color="action" sx={{ mr: 1 }} />
                    <Typography variant="body1">
                      {instructorInfo.name} ({instructorInfo.email})
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => window.open(`mailto:${instructorInfo.email}?subject=Question about ${classroom.name}`, '_blank')}
                    sx={{ mb: 1 }}
                  >
                    Contact Instructor
                  </Button>
                </Box>
              ) : null}
            </Box>
          )}

          {!isAuthenticated ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1">
                Please log in using the login options in the top right corner to join this classroom.
              </Typography>
            </Alert>
          ) : (
            <Box>
              {joinError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {joinError}
                </Alert>
              )}
              
              <Button
                variant="contained"
                size="large"
                onClick={handleJoinClassroom}
                disabled={joinLoading}
                sx={{ minWidth: 200 }}
              >
                {joinLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Joining...
                  </>
                ) : (
                  'Join Classroom'
                )}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default JoinClassroomPage;
