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
  selectClassroomById,
  selectClassroomsStatus
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
    if (state.classrooms.currentClassroom && 
        state.classrooms.currentClassroom.id === parseInt(classroomId || '0')) {
      return state.classrooms.currentClassroom;
    }
    return selectClassroomById(state, parseInt(classroomId || '0'));
  });
  
  const classroomsStatus = useAppSelector(selectClassroomsStatus);

  useEffect(() => {
    if (classroomId && !classroom) {
      dispatch(fetchClassroomByIdPublic(parseInt(classroomId)));
    }
  }, [classroomId, classroom, dispatch]);

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
        console.error('Error fetching instructor info:', error);
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
      console.error('Error joining classroom:', error);
      
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

  if (classroomsStatus === 'failed' || (!classroom && classroomsStatus === 'idle')) {
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
                <Box display="flex" alignItems="center">
                  <Person color="action" sx={{ mr: 1 }} />
                  <Typography variant="body1">
                    {instructorInfo.name} ({instructorInfo.email})
                  </Typography>
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
