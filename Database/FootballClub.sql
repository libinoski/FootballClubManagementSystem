-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Mar 09, 2024 at 10:30 AM
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
  `adminImage` varchar(2000) NOT NULL,
  `adminPassword` varchar(2000) NOT NULL,
  `registeredDate` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedDate` datetime DEFAULT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1,
  `deleteStatus` int(11) NOT NULL DEFAULT 0,
  `updateStatus` int(11) NOT NULL DEFAULT 0,
  `passwordUpdatedStatus` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Clubs`
--

CREATE TABLE `Clubs` (
  `clubId` int(11) NOT NULL,
  `clubName` varchar(255) NOT NULL,
  `ClubImage` varchar(2000) NOT NULL,
  `clubEmail` varchar(255) NOT NULL,
  `clubAddress` varchar(255) NOT NULL,
  `managerName` varchar(200) NOT NULL,
  `managerImage` varchar(2000) NOT NULL,
  `managerEmail` varchar(255) NOT NULL,
  `managerPhone` varchar(20) DEFAULT NULL,
  `managerAddress` varchar(255) DEFAULT NULL,
  `clubPassword` varchar(2000) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1,
  `isSuspended` int(11) NOT NULL DEFAULT 0,
  `registeredDate` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `FootballNews`
--

CREATE TABLE `FootballNews` (
  `newsId` int(11) NOT NULL,
  `adminId` int(11) NOT NULL,
  `newsImage` varchar(2000) NOT NULL,
  `newsContent` text NOT NULL,
  `addedDate` datetime NOT NULL DEFAULT current_timestamp(),
  `updatedDate` datetime DEFAULT NULL,
  `deleteStatus` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `averageRecoveryTime` int(11) NOT NULL,
  `deleteStatus` int(11) NOT NULL DEFAULT 0,
  `injuryDate` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Matches`
--

CREATE TABLE `Matches` (
  `matchId` int(11) NOT NULL,
  `adminId` int(11) NOT NULL,
  `clubId` int(11) NOT NULL,
  `matchName` varchar(255) NOT NULL,
  `homeTeamName` varchar(255) NOT NULL,
  `awayTeamName` varchar(255) NOT NULL,
  `homeTeamImage` varchar(2000) NOT NULL,
  `awayTeamImage` varchar(2000) NOT NULL,
  `matchLocation` varchar(255) NOT NULL,
  `matchPrize` varchar(50) NOT NULL,
  `matchDate` varchar(50) NOT NULL,
  `endStatus` int(11) NOT NULL DEFAULT 0,
  `deleteStatus` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `playerPosition` varchar(255) NOT NULL,
  `playerAddress` varchar(500) NOT NULL,
  `managerName` varchar(255) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1,
  `isInjured` int(11) NOT NULL DEFAULT 0,
  `updateStatus` int(11) NOT NULL DEFAULT 0,
  `isSuspended` int(11) NOT NULL DEFAULT 0,
  `registeredDate` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  ADD PRIMARY KEY (`newsId`),
  ADD KEY `adminId` (`adminId`);

--
-- Indexes for table `Injuries`
--
ALTER TABLE `Injuries`
  ADD PRIMARY KEY (`injuryId`),
  ADD KEY `playerId` (`playerId`),
  ADD KEY `clubId` (`clubId`);

--
-- Indexes for table `Matches`
--
ALTER TABLE `Matches`
  ADD PRIMARY KEY (`matchId`),
  ADD KEY `adminId` (`adminId`),
  ADD KEY `clubId` (`clubId`);

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
  MODIFY `adminId` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Clubs`
--
ALTER TABLE `Clubs`
  MODIFY `clubId` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `FootballNews`
--
ALTER TABLE `FootballNews`
  MODIFY `newsId` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Injuries`
--
ALTER TABLE `Injuries`
  MODIFY `injuryId` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Matches`
--
ALTER TABLE `Matches`
  MODIFY `matchId` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `FootballNews`
--
ALTER TABLE `FootballNews`
  ADD CONSTRAINT `footballnews_ibfk_1` FOREIGN KEY (`adminId`) REFERENCES `Admins` (`adminId`);

--
-- Constraints for table `Injuries`
--
ALTER TABLE `Injuries`
  ADD CONSTRAINT `injuries_ibfk_1` FOREIGN KEY (`playerId`) REFERENCES `Players` (`playerId`),
  ADD CONSTRAINT `injuries_ibfk_2` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`);

--
-- Constraints for table `Matches`
--
ALTER TABLE `Matches`
  ADD CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`adminId`) REFERENCES `Admins` (`adminId`),
  ADD CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`);

--
-- Constraints for table `Players`
--
ALTER TABLE `Players`
  ADD CONSTRAINT `players_ibfk_1` FOREIGN KEY (`clubId`) REFERENCES `Clubs` (`clubId`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
