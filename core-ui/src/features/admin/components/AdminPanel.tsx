import React, { useState } from 'react';
import {createDocumentCollection, useAppDispatch, DocumentCollectionCreate, Hierarchy, CollectionMetadata} from '@store';
import { useAuth } from "@hooks/useAuthContext.ts";

interface AdminPanelProps {
}

interface FormData {
  title: string;
  visibility: string;
  text_direction: string;
  language: string;
}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    visibility: 'public',
    text_direction: 'ltr',
    language: 'en'
  });
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      visibility: formData.visibility,
      text_direction: formData.text_direction,
      language: formData.language,
      hierarchy: {chapter:1, paragraph:2},
      collection_metadata: {},
      created_by_id: user?.id || 1,
    }
    dispatch(createDocumentCollection(payload));
    setSubmitted(true);
  };

  return (
    <div className="admin-panel">
      <h1>Admin Panel - Document Collection Form</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title: </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="visibility">Visibility: </label>
          <select
            id="visibility"
            name="visibility"
            value={formData.visibility}
            onChange={handleChange}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="text_direction">Text Direction: </label>
          <select
            id="text_direction"
            name="text_direction"
            value={formData.text_direction}
            onChange={handleChange}
          >
            <option value="ltr">Left to Right (LTR)</option>
            <option value="rtl">Right to Left (RTL)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="language">Language: </label>
          <select
            id="language"
            name="language"
            value={formData.language}
            onChange={handleChange}
          >
            <option value="en">English</option>
            <option value="ja">Japanese</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
          </select>
        </div>

        <button type="submit">Submit</button>
      </form>

      {submitted && (
        <div className="submitted-data">
          <h2>Entered Information:</h2>
          <p><strong>Title:</strong> {formData.title}</p>
          <p><strong>Visibility:</strong> {formData.visibility}</p>
          <p><strong>Text Direction:</strong> {formData.text_direction}</p>
          <p><strong>Language:</strong> {formData.language}</p>
          <p><strong>User:</strong> {user?.first_name} {user?.last_name}</p>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;