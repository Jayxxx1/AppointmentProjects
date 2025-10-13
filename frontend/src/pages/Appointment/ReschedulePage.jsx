import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService';
import Swal from 'sweetalert2';

const ReschedulePage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing your response...');

  useEffect(() => {
    const processResponse = async () => {
      const queryParams = new URLSearchParams(location.search);
      const action = queryParams.get('action');
      const reason = queryParams.get('reason') || '';

      if (!action) {
        setMessage('Invalid action.');
        return;
      }

      const accepted = action === 'approve';

      try {
        await appointmentService.respondToReschedule(id, { accepted, reason });
        Swal.fire({
          icon: 'success',
          title: 'Response Submitted',
          text: `The reschedule request has been successfully ${accepted ? 'approved' : 'rejected'}.`,
          timer: 3000,
          timerProgressBar: true,
        }).then(() => {
            navigate('/appointments');
        });
      } catch (error) {
        console.error('Error responding to reschedule request:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to submit your response. Please try again.',
        }).then(() => {
            navigate('/appointments');
        });
      }
    };

    processResponse();
  }, [id, location, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{message}</h1>
        <p>You will be redirected shortly.</p>
      </div>
    </div>
  );
};

export default ReschedulePage;
