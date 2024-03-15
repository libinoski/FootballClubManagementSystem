-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Mar 15, 2024 at 01:33 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `FootballClub`
--

-- --------------------------------------------------------

--
-- Table structure for table `Admins`
--

CREATE TABLE `Admins` (
  `adminId` int(11) NOT NULL,
  `adminName` varchar(255) NOT NULL,
  `adminEmail` varchar(255) NOT NULL,
  `adminMobile` varchar(200) NOT NULL,
  `adminAddress` varchar(500) NOT NULL,
  `adminImage` varchar(2000) NOT NULL,
  `adminPassword` varchar(2000) NOT NULL,
  `registeredDate` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedDate` datetime DEFAULT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1,
  `deleteStatus` int(11) NOT NULL DEFAULT 0,
  `updateStatus` int(11) NOT NULL DEFAULT 0,
  `passwordUpdatedStatus` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Admins`
--

INSERT INTO `Admins` (`adminId`, `adminName`, `adminEmail`, `adminMobile`, `adminAddress`, `adminImage`, `adminPassword`, `registeredDate`, `updatedDate`, `isActive`, `deleteStatus`, `updateStatus`, `passwordUpdatedStatus`) VALUES
(7, 'Ajay Kumar Ma', 'ajay12345@gmail.com', '8113010619', 'Mundakkayam', 'https://medinscare.s3.ap-south-1.amazonaws.com/adminImages/adminImage-1710165327028.jpeg', '$2b$10$q6Xp6W0fZ9G4uXZReZnhTOiGqa2LJsEWaoXtLpJasHLIumEavfN2G', '2024-03-11 19:25:27', '2024-03-14 00:00:00', 1, 0, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `Clubs`
--

CREATE TABLE `Clubs` (
  `clubId` int(11) NOT NULL,
  `clubName` varchar(255) NOT NULL,
  `clubImage` varchar(2000) NOT NULL,
  `clubEmail` varchar(255) NOT NULL,
  `clubAddress` varchar(255) NOT NULL,
  `managerName` varchar(200) NOT NULL,
  `managerImage` varchar(2000) NOT NULL,
  `managerEmail` varchar(255) NOT NULL,
  `managerMobile` varchar(20) DEFAULT NULL,
  `clubPassword` varchar(2000) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1,
  `updateStatus` int(11) NOT NULL DEFAULT 0,
  `isSuspended` int(11) NOT NULL DEFAULT 0,
  `registeredDate` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Clubs`
--

INSERT INTO `Clubs` (`clubId`, `clubName`, `clubImage`, `clubEmail`, `clubAddress`, `managerName`, `managerImage`, `managerEmail`, `managerMobile`, `clubPassword`, `isActive`, `updateStatus`, `isSuspended`, `registeredDate`) VALUES
(6, 'Paris Saint Germain Football Club', 'https://medinscare.s3.ap-south-1.amazonaws.com/clubImages/clubImage-1710427741606.jpeg', 'psgfc@gmail.com', 'Its headquarters are located at 24, rue du Commandant Guilbaud ', 'Luis Enrique', 'https://medinscare.s3.ap-south-1.amazonaws.com/clubImages/managerImage-1710427742720.jpeg', 'psgmanager@gmail.com', '8113010619', '$2b$10$rMt90LEomD.Gg2pt6ne.KO6rDarn6N6qs4OuDstjx7KFphaocGkKu', 1, 0, 0, '2024-03-14 20:19:03'),
(7, 'Kerala blasters', 'https://medinscare.s3.ap-south-1.amazonaws.com/clubImages/clubImage-1710428060262.jpeg', 'info@kbfcofficial.com', 'Kerala Blasters FC 4th Floor, Trans Asia Corporate Park Infopark, Kakkanad Kochi - 682042 Kerala, India', 'Ivan Vukomanovic', 'https://medinscare.s3.ap-south-1.amazonaws.com/clubImages/managerImage-1710428061020.jpeg', 'ivan2022@gmail.com', '8113010619', '$2b$10$BLZq/soKlv9IuYZD8Eg2fe286f.H3vo7MdXlOGK6g4pOfBahB7AaK', 1, 0, 0, '2024-03-14 20:24:21'),
(8, 'Al Nasar', 'https://medinscare.s3.ap-south-1.amazonaws.com/clubImages/clubImage-1710428257312.jpeg', 'alnasarinfo@gmail.com', 'Al Nassr Saudi Club, with headquarters at Al-Uraija District, Riyadh 11555, Kingdom of Saudi Arabia, P.O. Box: 60506, fax: 2624494, (hereinafter, the “Club” or “Al Nassr”),', 'Luis Castro', 'https://medinscare.s3.ap-south-1.amazonaws.com/clubImages/managerImage-1710428257884.jpeg', 'luiscastro@gmail.com', '8113010619', '$2b$10$lr1FJgJH5qYA2.cEvnqgNewfIjMLXbRBGCfEB3EG5CJvb6wdyX8EK', 1, 0, 0, '2024-03-14 20:27:38');

-- --------------------------------------------------------

--
-- Table structure for table `FootballNews`
--

CREATE TABLE `FootballNews` (
  `footballNewsId` int(11) NOT NULL,
  `adminId` int(11) NOT NULL,
  `footballNewsTitle` varchar(2000) NOT NULL,
  `footballNewsImage` varchar(2000) NOT NULL,
  `footballNewsContent` varchar(2000) NOT NULL,
  `addedDate` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedDate` datetime DEFAULT NULL,
  `deleteStatus` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `FootballNews`
--

INSERT INTO `FootballNews` (`footballNewsId`, `adminId`, `footballNewsTitle`, `footballNewsImage`, `footballNewsContent`, `addedDate`, `updatedDate`, `deleteStatus`) VALUES
(4, 7, 'Striker Swap: Premier League Giants Eyeing Cross-Club Transfer Deal', 'https://medinscare.s3.ap-south-1.amazonaws.com/footballNewsImages/WhatsApp Image 2024-03-14 at 20.05.11.jpeg', ' Rumors swirl as reports suggest that two Premier League heavyweights are considering a surprising swap deal involving star strikers. Sources close to the clubs hint at a potential shake-up that could see a dramatic shift in attacking firepower.', '2024-03-14 20:50:02', NULL, 0),
(5, 7, 'Youth Revolution: Championship Side Unveils Ambitious Academy Expansion Plans\"', 'https://medinscare.s3.ap-south-1.amazonaws.com/footballNewsImages/WhatsApp Image 2024-03-14 at 20.04.06.jpeg', 'In a bid to secure their future and nurture local talent, a Championship football club has unveiled ambitious plans for expanding its youth academy. With an eye on developing the next generation of football stars, the club aims to create state-of-the-art facilities and increase scouting efforts.', '2024-03-14 20:50:30', NULL, 0),
(6, 7, 'Injury Blow: European Powerhouse Hit by Key Midfielder\'s Long-Term Absence', 'https://medinscare.s3.ap-south-1.amazonaws.com/footballNewsImages/WhatsApp Image 2024-03-14 at 20.04.31.jpeg', 'Concerns mount for fans of a top European club as news breaks of a significant injury setback for one of their key midfielders. With the player facing an extended spell on the sidelines, questions arise about the team\'s depth and strategy to cope with the absence during crucial fixtures.', '2024-03-14 20:51:14', NULL, 0),
(7, 7, 'Transfer Tug-of-War: Rival Clubs Lock Horns Over Coveted Defensive Prospect', 'https://medinscare.s3.ap-south-1.amazonaws.com/footballNewsImages/WhatsApp Image 2024-03-14 at 20.04.52.jpeg', 'Transfer speculation intensifies as two rival clubs find themselves in a heated battle for the signature of a highly sought-after defensive prospect. With both sides eager to bolster their backline, negotiations are expected to be intense as they vie for the talented player\'s services.\r\n\r\nTitle: \"Managerial Reshuffle: Surprise Candidate Emerges as Contender for National Team Role', '2024-03-14 20:51:49', NULL, 0),
(8, 7, 'Managerial Reshuffle: Surprise Candidate Emerges as Contender for National Team Role', 'https://medinscare.s3.ap-south-1.amazonaws.com/footballNewsImages/WhatsApp Image 2024-03-14 at 20.04.41.jpeg', 'Speculation mounts over the future leadership of a national football team as a surprise candidate emerges as a contender for the vacant managerial role. With a track record of success at club level, the potential appointment raises eyebrows and sparks debate among fans and pundits alike.', '2024-03-14 20:52:21', NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `Injuries`
--

CREATE TABLE `Injuries` (
  `injuryId` int(11) NOT NULL,
  `playerId` int(11) NOT NULL,
  `clubId` int(11) NOT NULL,
  `playerName` varchar(255) NOT NULL,
  `playerImage` varchar(2000) NOT NULL,
  `clubName` varchar(255) NOT NULL,
  `injuryType` varchar(255) NOT NULL,
  `averageRecoveryTime` varchar(100) NOT NULL,
  `deleteStatus` int(11) NOT NULL DEFAULT 0,
  `injuryDate` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Leave_Request_To_Club`
--

CREATE TABLE `Leave_Request_To_Club` (
  `leaveRequestId` int(11) NOT NULL,
  `clubId` int(11) NOT NULL,
  `playerId` int(11) NOT NULL,
  `playerName` varchar(200) NOT NULL,
  `message` varchar(2000) NOT NULL,
  `sendDate` datetime DEFAULT current_timestamp(),
  `isSuccess` int(11) DEFAULT 1,
  `isApproved` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Leave_Request_To_Club`
--

INSERT INTO `Leave_Request_To_Club` (`leaveRequestId`, `clubId`, `playerId`, `playerName`, `message`, `sendDate`, `isSuccess`, `isApproved`) VALUES
(1, 7, 4, 'Adrian Luna', 'i need leave', '2024-03-14 22:16:04', 1, 0),
(2, 7, 4, 'Adrian Luna', 'dwedwed', '2024-03-14 22:16:38', 1, 0),
(3, 7, 4, 'Adrian Luna', 'ewded', '2024-03-14 22:31:36', 1, 1),
(4, 7, 4, 'Adrian Luna', 'ed34d', '2024-03-14 22:33:32', 1, 0),
(5, 7, 4, 'Adrian Luna', 'ewdd', '2024-03-14 22:37:07', 1, 1),
(6, 7, 4, 'Adrian Luna', 'Hospital emergency', '2024-03-15 01:50:08', 1, 0),
(7, 7, 4, 'Adrian Luna', 'Not feeling well', '2024-03-15 01:50:16', 1, 0),
(8, 7, 4, 'Adrian Luna', 'Got injured during practice', '2024-03-15 01:50:32', 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `Matches`
--

CREATE TABLE `Matches` (
  `matchId` int(11) NOT NULL,
  `adminId` int(11) NOT NULL,
  `matchName` varchar(255) NOT NULL,
  `homeTeamName` varchar(255) NOT NULL,
  `awayTeamName` varchar(255) NOT NULL,
  `homeTeamImage` varchar(2000) NOT NULL,
  `awayTeamImage` varchar(2000) NOT NULL,
  `matchLocation` varchar(255) NOT NULL,
  `matchPrize` varchar(50) NOT NULL,
  `teamOneTotalGoalsInMatch` varchar(2) NOT NULL DEFAULT '0',
  `teamTwoTotalGoalsInMatch` varchar(2) NOT NULL DEFAULT '0',
  `matchDate` varchar(50) NOT NULL,
  `endStatus` int(11) NOT NULL DEFAULT 0,
  `deleteStatus` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Matches`
--

INSERT INTO `Matches` (`matchId`, `adminId`, `matchName`, `homeTeamName`, `awayTeamName`, `homeTeamImage`, `awayTeamImage`, `matchLocation`, `matchPrize`, `teamOneTotalGoalsInMatch`, `teamTwoTotalGoalsInMatch`, `matchDate`, `endStatus`, `deleteStatus`) VALUES
(4, 7, 'Match one', 'Kerala blasters', 'Bengaluru FC', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/kbfc.jpeg', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/bengalurefc.jpeg', 'Kochi', 'No prize', '0', '0', '2024-03-22', 0, 0),
(5, 7, 'Match two', 'Kerala blasters fc', 'Odisha Fc', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/kbfc.jpeg', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/odishafc.jpeg', 'Kochi', 'No prize', '0', '0', '2024-03-22', 0, 0),
(6, 7, 'Match three', 'Paris Saint Germain', 'Al Nasar ', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/psg.jpeg', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/Al-Nassr.jpeg', 'Paris, France', 'Tournament trophy', '0', '0', '2024-03-16', 0, 0),
(7, 7, 'Match four', 'Real madrid', 'Fc barcelona', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/realmadrid.jpeg', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/barcelona.jpeg', 'Barcelona, Spain', 'No prize, Friendly match', '0', '0', '2024-03-21', 0, 0),
(8, 7, 'Match five', 'Bengaluru fc', 'Kerala blasters', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/bengalurefc.jpeg', 'https://medinscare.s3.ap-south-1.amazonaws.com/matchImages/kbfc.jpeg', 'Bengaluru', 'No prize', '0', '0', '2024-03-21', 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `Notification_To_Players`
--

CREATE TABLE `Notification_To_Players` (
  `notificationId` int(11) NOT NULL,
  `clubId` int(11) NOT NULL,
  `playerId` int(11) NOT NULL,
  `message` varchar(2000) NOT NULL,
  `sendDate` datetime DEFAULT current_timestamp(),
  `isSuccess` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Notification_To_Players`
--

INSERT INTO `Notification_To_Players` (`notificationId`, `clubId`, `playerId`, `message`, `sendDate`, `isSuccess`) VALUES
(5, 7, 4, 'wede3dewq', '2024-03-15 01:02:02', 1);

-- --------------------------------------------------------

--
-- Table structure for table `Players`
--

CREATE TABLE `Players` (
  `playerId` int(11) NOT NULL,
  `clubId` int(11) NOT NULL,
  `clubName` varchar(255) NOT NULL,
  `playerName` varchar(255) NOT NULL,
  `playerImage` varchar(2000) NOT NULL,
  `playerAge` int(11) NOT NULL,
  `playerEmail` varchar(255) NOT NULL,
  `playerMobile` varchar(20) NOT NULL,
  `playerCountry` varchar(100) NOT NULL,
  `playerPosition` varchar(255) NOT NULL,
  `playerAddress` varchar(500) NOT NULL,
  `playerPassword` varchar(2000) NOT NULL,
  `managerName` varchar(255) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 0,
  `deleteStatus` int(11) NOT NULL DEFAULT 0,
  `updateStatus` int(11) NOT NULL DEFAULT 0,
  `isSuspended` int(11) NOT NULL DEFAULT 0,
  `isApproved` int(11) NOT NULL DEFAULT 0,
  `isInjured` int(11) NOT NULL DEFAULT 0,
  `registeredDate` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Players`
--

INSERT INTO `Players` (`playerId`, `clubId`, `clubName`, `playerName`, `playerImage`, `playerAge`, `playerEmail`, `playerMobile`, `playerCountry`, `playerPosition`, `playerAddress`, `playerPassword`, `managerName`, `isActive`, `deleteStatus`, `updateStatus`, `isSuspended`, `isApproved`, `isInjured`, `registeredDate`) VALUES
(4, 7, 'Kerala blasters', 'Adrian Luna', 'https://medinscare.s3.ap-south-1.amazonaws.com/playerImages/Adrian Luna', 28, 'lunakbfc@gmail.com', '8113010619', 'Uruguay', 'Striker', 'Calle del Sol, 23 28001 Madrid España', '$2b$10$eEz4mm1IJ1hPb9BAazT1gukQKhh/0mHg2xe7HbLrfpuDlupSDyaea', 'Ivan Vukomanovic', 1, 0, 0, 0, 1, 0, '2024-03-14 22:14:17');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Admins`
--
ALTER TABLE `Admins`
  ADD PRIMARY KEY (`adminId`);

--
-- Indexes for table `Clubs`
--
ALTER TABLE `Clubs`
  ADD PRIMARY KEY (`clubId`);

--
-- Indexes for table `FootballNews`
--
ALTER TABLE `FootballNews`
  ADD PRIMARY KEY (`footballNewsId`),
  ADD KEY `adminId` (`adminId`);

--
-- Indexes for table `Injuries`
--
ALTER TABLE `Injuries`
  ADD PRIMARY KEY (`injuryId`),
  ADD KEY `playerId` (`playerId`),
  ADD KEY `clubId` (`clubId`);

--
-- Indexes for table `Leave_Request_To_Club`
--
ALTER TABLE `Leave_Request_To_Club`
  ADD PRIMARY KEY (`leaveRequestId`),
  ADD KEY `clubId` (`clubId`),
  ADD KEY `playerId` (`playerId`);

--
-- Indexes for table `Matches`
--
ALTER TABLE `Matches`
  ADD PRIMARY KEY (`matchId`),
  ADD KEY `adminId` (`adminId`);

--
-- Indexes for table `Notification_To_Players`
--
ALTER TABLE `Notification_To_Players`
  ADD PRIMARY KEY (`notificationId`),
  ADD KEY `clubId` (`clubId`),
  ADD KEY `playerId` (`playerId`);

--
-- Indexes for table `Players`
--
ALTER TABLE `Players`
  ADD PRIMARY KEY (`playerId`),
  ADD KEY `clubId` (`clubId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Admins`
--
ALTER TABLE `Admins`
  MODIFY `adminId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `Clubs`
--
ALTER TABLE `Clubs`
  MODIFY `clubId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `FootballNews`
--
ALTER TABLE `FootballNews`
  MODIFY `footballNewsId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `Injuries`
--
ALTER TABLE `Injuries`
  MODIFY `injuryId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `Leave_Request_To_Club`
--
ALTER TABLE `Leave_Request_To_Club`
  MODIFY `leaveRequestId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `Matches`
--
ALTER TABLE `Matches`
  MODIFY `matchId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `Notification_To_Players`
--
ALTER TABLE `Notification_To_Players`
  MODIFY `notificationId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `Players`
--
ALTER TABLE `Players`
  MODIFY `playerId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `FootballNews`
--
ALTER TABLE `FootballNews`
  ADD CONSTRAINT `footballnews_ibfk_1` FOREIGN KEY (`adminId`) REFERENCES `Admins` (`adminId`) ON DELETE CASCADE;

--
-- Constraints for table `Injuries`
--
ALTER TABLE `Injuries`
  ADD CONSTRAINT `injuries_ibfk_1` FOREIGN KEY (`playerId`) REFERENCES `Players` (`playerId`) ON DELETE CASCADE,
  ADD CONSTRAINT `injuries_ibfk_2` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE;

--
-- Constraints for table `Leave_Request_To_Club`
--
ALTER TABLE `Leave_Request_To_Club`
  ADD CONSTRAINT `leave_request_to_club_ibfk_1` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE,
  ADD CONSTRAINT `leave_request_to_club_ibfk_2` FOREIGN KEY (`playerId`) REFERENCES `Players` (`playerId`) ON DELETE CASCADE;

--
-- Constraints for table `Matches`
--
ALTER TABLE `Matches`
  ADD CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`adminId`) REFERENCES `Admins` (`adminId`) ON DELETE CASCADE;

--
-- Constraints for table `Notification_To_Players`
--
ALTER TABLE `Notification_To_Players`
  ADD CONSTRAINT `notification_to_players_ibfk_1` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE,
  ADD CONSTRAINT `notification_to_players_ibfk_2` FOREIGN KEY (`playerId`) REFERENCES `Players` (`playerId`) ON DELETE CASCADE;

--
-- Constraints for table `Players`
--
ALTER TABLE `Players`
  ADD CONSTRAINT `players_ibfk_1` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
