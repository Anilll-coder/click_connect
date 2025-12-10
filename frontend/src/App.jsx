import './App.css'
import {BrowserRouter,Routes,Route} from "react-router-dom"
import "./App.css"
import AuthPage from './pages/Auth'
import ClickConnectChatbot from './pages/Chatbot'
import Layout from './Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomeContent from './pages/Home'
import MyPosts from './pages/Myposts'
import PostCreator from './pages/CreatePost'
import AnonymousPage from './pages/Anonymous'
import NotificationsPage from './pages/Notifications'
import SettingsPage from './pages/Settings'
import UserProfilePage from './pages/UserProfile'
import PostView from './pages/PostView'

function App() {
  return (
    <>
      <BrowserRouter>
          <Routes>
              <Route path='/' element={<Layout><HomeContent/></Layout>}/>
              <Route path='/anonymous' element={<Layout><AnonymousPage/></Layout>}/>
              <Route path='/notifications' element={<Layout><ProtectedRoute><NotificationsPage/></ProtectedRoute></Layout>}/>
              <Route path='/settings' element={<Layout><ProtectedRoute><SettingsPage/></ProtectedRoute></Layout>}/>
              <Route path='/user/:username' element={<Layout><UserProfilePage/></Layout>}/>
              <Route path='/myposts' element={<Layout><MyPosts/></Layout>}/>
              <Route path='/create' element={<Layout><PostCreator/></Layout>}/>
              <Route path='/post/:id' element={<Layout><PostView/></Layout>}/>
              <Route path='/login' element={<AuthPage/>}/>
              <Route path='/bot' element={<Layout><ClickConnectChatbot/></Layout>}/>
          </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
